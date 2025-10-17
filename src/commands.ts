import { AppState, loadMcpServers, findConfigPath } from './config';
import { forceCheckForUpdate } from './update';
import { loadSshServers, saveSshServers, SshServer } from './ssh-manager';
import chalk from 'chalk';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Client } from 'ssh2';
import { spawn } from 'child_process';

import * as readlineSync from 'readline-sync';
import * as yaml from 'yaml';

const getPassword = (prompt: string): string => {
    try {
        return readlineSync.question(prompt, { hideEchoBack: true });
    } catch (error) {
        console.error(chalk.red('Error reading password input'));
        return '';
    }
}

export async function handleSlashCommand(state: AppState, input: string): Promise<boolean> {
    const parts = input.trim().split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    switch (command) {
        case '/exit':
            if (state.ssh.client) state.ssh.client.end();
            return true;

        case '/help':
            console.log(chalk.yellow(`
Available Commands:

  Chat & Context:
    /context             - Display the current system context
    /resetchat           - Reset the current conversation memory
    /savechat            - Save the conversation to a file
    /loadchat <filename> - Load a conversation from a file
    /chats-list          - List saved chat files
    /chats-delete <file> - Delete a saved chat file

   
  LLM & Model:
    /model <model_name>               - Change the LLM model for this session
    /temp <0.0-2.0>                   - Change the LLM temperature for this session
    /model-reset                      - Reset model to the value from config file
    /temp-reset                       - Reset temperature to the value from config file

  Interface:
    /mode <line|editor|multiline>     - Change the input mode for the current session
    /output [markdown|text] [--save]  - Show or set output format; use --save to persist to config
    /output-reset                     - Reset output format to default from config

  Connections & Files:
    /status              - Show current SSH connection status
    /connect <alias|user@host> - Connect to a server via alias or direct connection
    /disconnect          - Disconnect from the remote server
    /ls-files [path]     - List files and directories
    /list-ssh            - List all saved SSH server aliases
    /add-ssh <alias> <user@host> [-i key_path] - Add or update a saved SSH server
    /rm-ssh <alias>      - Remove a saved SSH server

  MCP Tools:
    /mcp-list            - List available MCP servers from config
    /mcp-tools           - List all discovered tools from loaded MCP servers
    /mcp-reload          - Reload the MCP servers configuration

  General:
    /help                - Show this help message
    /clear               - Clear the screen
    /update              - Check for application updates
`));
            break;

        case '/clear':
            console.clear();
            break;

        case '/context':
            if (state.system_context) {
                console.log(chalk.yellow(`System Context:\n---\n${state.system_context}`));
            } else {
                console.log(chalk.yellow('No system context loaded.'));
            }
            break;

        case '/status':
            if (state.ssh.client) {
                console.log(chalk.green(`Connected to ${state.ssh.host_string}`));
            } else {
                console.log(chalk.yellow('Not connected to any server.'));
            }
            break;

        case '/connect':
            if (state.ssh.client) {
                console.log(chalk.red('Already connected. Please /disconnect first.'));
                break;
            }
            if (args.length === 0) {
                console.log(chalk.red('Usage: /connect <alias | user@hostname> [-i /path/to/key]'));
                break;
            }
            const connectArg = args[0];
            if (connectArg.includes('@')) {
                // Direct connection
                connectSsh(state, args);
            } else {
                // Alias connection
                const servers = loadSshServers();
                const server = servers[connectArg];
                if (server) {
                    const connectParams = [`${server.user}@${server.host}`];
                    if (server.keyPath) {
                        connectParams.push('-i', server.keyPath);
                    }
                    connectSsh(state, connectParams);
                } else {
                    console.log(chalk.red(`Error: SSH alias '${connectArg}' not found.`));
                }
            }
            break;

        case '/disconnect':
            if (state.ssh.client) {
                state.ssh.client.end();
                state.ssh.client = null;
                console.log(chalk.yellow(`Disconnected from ${state.ssh.host_string}`));
                state.ssh.host_string = null;
            } else {
                console.log(chalk.yellow('Not connected.'));
            }
            break;

        case '/list-ssh':
            const servers = loadSshServers();
            if (Object.keys(servers).length === 0) {
                console.log(chalk.yellow('No saved SSH servers.'));
                break;
            }
            console.log(chalk.yellow('Saved SSH Servers:\n'));
            for (const alias in servers) {
                const server = servers[alias];
                const keyInfo = server.keyPath ? `(key: ${server.keyPath})` : '(password/default key)';
                console.log(`  - ${chalk.bold(alias)}: ${server.user}@${server.host} ${chalk.dim(keyInfo)}`);
            }
            break;

        case '/add-ssh':
            if (args.length < 2) {
                console.log(chalk.red('Usage: /add-ssh <alias> <user@host> [-i /path/to/key]'));
                break;
            }
            const [alias, userAtHost] = args;
            const keyIndex = args.indexOf('-i');
            let keyPath: string | undefined;
            if (keyIndex !== -1 && args.length > keyIndex + 1) {
                keyPath = args[keyIndex + 1];
            }

            if (!userAtHost.includes('@')) {
                console.log(chalk.red('Invalid format. Please use <user@host>.'));
                break;
            }
            const [user, host] = userAtHost.split('@');

            const sshConfig = loadSshServers();
            sshConfig[alias] = { user, host, keyPath };
            if (saveSshServers(sshConfig)) {
                console.log(chalk.green(`SSH server '${alias}' saved.`));
            }
            break;

        case '/rm-ssh':
            if (args.length === 0) {
                console.log(chalk.red('Usage: /rm-ssh <alias>'));
                break;
            }
            const aliasToRemove = args[0];
            const sshConfigToRemove = loadSshServers();
            if (sshConfigToRemove[aliasToRemove]) {
                delete sshConfigToRemove[aliasToRemove];
                if (saveSshServers(sshConfigToRemove)) {
                    console.log(chalk.green(`SSH server '${aliasToRemove}' removed.`));
                }
            } else {
                console.log(chalk.red(`Error: SSH alias '${aliasToRemove}' not found.`));
            }
            break;

        case '/resetchat':
            state.conversation = state.system_context ? [{ role: 'system', content: state.system_context }] : [];
            console.log(chalk.yellow('Conversation memory has been reset.'));
            break;

        case '/savechat':
            saveChatToFile(state);
            break;

        case '/loadchat':
            if (args.length === 0) {
                console.log(chalk.red('Usage: /loadchat <filename>'));
                break;
            }
            loadChatFromFile(state, args[0]);
            break;

        case '/model':
            if (args.length === 0) {
                console.log(chalk.yellow(`Current model: ${state.session_config.llm.model}`));
            } else {
                state.session_config.llm.model = args.join(' ');
                console.log(chalk.yellow(`Model for this session set to: ${state.session_config.llm.model}`));
            }
            break;

        case '/temp':
            if (args.length === 0) {
                console.log(chalk.yellow(`Current temperature: ${state.session_config.llm.temperature}`));
            } else {
                const newTemp = parseFloat(args[0]);
                if (isNaN(newTemp)) {
                    console.log(chalk.red('Invalid temperature. Please provide a number.'));
                } else {
                    state.session_config.llm.temperature = newTemp;
                    console.log(chalk.yellow(`Temperature for this session set to: ${newTemp}`));
                }
            }
            break;

        case '/mode':
            const allowedModes = ['line', 'editor', 'multiline'];
            if (args.length === 0) {
                console.log(chalk.yellow(`Current input mode: ${state.session_config.cli?.input_mode || 'line'}`));
                console.log(chalk.dim(`Available modes: ${allowedModes.join(', ')}`));
            } else {
                const newMode = args[0];
                if (allowedModes.includes(newMode)) {
                    if (!state.session_config.cli) state.session_config.cli = {};
                    state.session_config.cli.input_mode = newMode;
                    console.log(chalk.yellow(`Input mode for this session set to: ${newMode}`));
                } else {
                    console.log(chalk.red(`Invalid mode. Please use one of: ${allowedModes.join(', ')}`));
                }
            }
            break;

        case '/output':
        case '/output-format': {
            const allowed = ['markdown', 'text'];
            const hasSave = args.includes('--save') || args.includes('-s');
            const fmtArg = args.find(a => !a.startsWith('-'));

            const current = state.session_config?.cli?.output_format || 'markdown';
            if (!fmtArg) {
                console.log(chalk.yellow(`Current output format: ${current}`));
                console.log(chalk.dim(`Usage: /output <${allowed.join('|')}> [--save]`));
                break;
            }

            const fmt = fmtArg.toLowerCase();
            if (!allowed.includes(fmt)) {
                console.log(chalk.red(`Invalid output format. Use one of: ${allowed.join(', ')}`));
                break;
            }

            if (!state.session_config.cli) state.session_config.cli = {};
            state.session_config.cli.output_format = fmt;
            console.log(chalk.yellow(`Output format for this session set to: ${fmt}`));

            if (hasSave) {
                const configFile = path.join(state.configPath, 'config.yaml');
                try {
                    const raw = fs.readFileSync(configFile, 'utf8');
                    const conf = yaml.parse(raw) || {};
                    if (!conf.cli) conf.cli = {};
                    conf.cli.output_format = fmt;
                    fs.writeFileSync(configFile, yaml.stringify(conf));
                    console.log(chalk.green('Output format saved to config.yaml'));
                } catch (e: any) {
                    console.log(chalk.red(`Failed to save to config.yaml: ${e.message}`));
                }
            }
            break;
        }

        case '/output-reset': {
            const defaultFmt = (state.original_config?.cli?.output_format) || 'text';
            if (!state.session_config.cli) state.session_config.cli = {};
            state.session_config.cli.output_format = defaultFmt;
            console.log(chalk.yellow(`Output format reset to default: ${defaultFmt}`));
            break;
        }

        case '/model-reset':
            state.session_config.llm.model = state.original_config.llm.model;
            console.log(chalk.yellow(`Model reset to default: ${state.session_config.llm.model}`));
            break;

        case '/temp-reset':
            state.session_config.llm.temperature = state.original_config.llm.temperature;
            console.log(chalk.yellow(`Temperature reset to default: ${state.session_config.llm.temperature}`));
            break;

        case '/chats-list':
            listSavedChats();
            break;

        case '/chats-delete':
            if (args.length === 0) {
                console.log(chalk.red('Usage: /chats-delete <filename>'));
                break;
            }
            deleteChatFile(args[0]);
            break;

        case '/ls-files':
            const targetPath = args[0] || '.';
            listLocalFiles(targetPath);
            break;

        case '/mcp-list':
            if (state.mcp_servers && state.mcp_servers.mcpServers) {
                const serverNames = Object.keys(state.mcp_servers.mcpServers);
                console.log(chalk.yellow('Available MCP Servers:\n') + serverNames.map(s => `  - ${s}`).join('\n'));
            } else {
                console.log(chalk.yellow('No MCP servers configured.'));
            }
            break;

        case '/mcp-tools':
            if (state.dynamic_tool_defs.length === 0) {
                console.log(chalk.yellow('No MCP tools were discovered.'));
                break;
            }
            console.log(chalk.yellow('Discovered MCP Tools:\n'));
            for (const toolDef of state.dynamic_tool_defs) {
                const fullName = toolDef.function.name;
                const parts = fullName.split('_');
                const serverName = parts.shift();
                const originalName = parts.join('_');

                console.log(chalk.cyan.bold(`  Tool: ${fullName}`));
                console.log(chalk.dim(`    - Original Name: ${originalName}`));
                console.log(chalk.dim(`    - Server: ${serverName}`));
                console.log(chalk.dim(`    - Description: ${toolDef.function.description || 'N/A'}`));
            }
            break;

        case '/mcp-reload':
            const configPath = findConfigPath();
            if (configPath) {
                state.mcp_servers = loadMcpServers(configPath);
                console.log(chalk.green('MCP servers configuration reloaded.'));
            } else {
                console.log(chalk.red('Could not find .banjin configuration directory.'));
            }
// ... (rest of the file is the same until the /update case)

        case '/update':
            const update = await forceCheckForUpdate();
            if (update) {
                console.log(chalk.yellow(`A new version is available!`));
                console.log(`Current version: ${update.current}`);
                console.log(`Latest version: ${update.latest}`);
                
                const confirm = readlineSync.keyInYN('Would you like to update now?');

                if (confirm) {
                    console.log(chalk.dim('Updating...'));
                    const child = spawn('npm', ['install', '-g', `${update.name}@latest`], { stdio: 'inherit' });

                    child.on('close', (code) => {
                        if (code === 0) {
                            console.log(chalk.green('\nUpdate complete! Please restart the application.'));
                        } else {
                            console.log(chalk.red(`\nUpdate failed with code ${code}.`));
                        }
                        process.exit(0);
                    });
                } else {
                    console.log(chalk.yellow('Update cancelled.'));
                }
            } else {
                console.log(chalk.green('You are already using the latest version.'));
            }
            break;

        default:
            console.log(chalk.red(`Unknown command: ${command}`));
            break;
    }

    return false;
}

// --- Helper Functions for Commands ---

async function connectSsh(state: AppState, args: string[]) {
    const hostString = args[0];
    // This check is now handled by the caller, but we keep it as a fallback.
    if (!hostString.includes('@')) {
        console.log(chalk.red('Invalid host string. Format should be user@hostname'));
        return;
    }

    let keyFilename: string | undefined;
    const iIndex = args.indexOf('-i');
    const pIndex = args.indexOf('-p');

    if (iIndex !== -1 && args.length > iIndex + 1) {
        keyFilename = path.resolve(os.homedir(), args[iIndex + 1]);
    } else if (pIndex !== -1 && args.length > pIndex + 1) {
        keyFilename = path.resolve(os.homedir(), args[pIndex + 1]);
    }

    console.log(chalk.dim(`Connecting to ${hostString}...`));
    const [username, host] = hostString.split('@');
    const conn = new Client();

    conn.on('ready', () => {
        state.ssh.client = conn;
        state.ssh.host_string = hostString;
        console.log(chalk.green(`Successfully connected to ${hostString}`));
    }).on('error', (err) => {
        console.log(chalk.red(`Connection error: ${err.message}`));
    }).on('end', () => {
        if (state.ssh.client) {
            state.ssh.client.end();
            state.ssh.client = null;
            state.ssh.host_string = null;
            console.log(chalk.yellow(`Connection to ${hostString} ended.`));
        }
    }).on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
        if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
            const password = getPassword(prompts[0].prompt);
            finish([password]);
        } else {
            finish([]);
        }
    });

    let privateKey: Buffer | undefined;
    if (keyFilename) {
        if (fs.existsSync(keyFilename)) {
            privateKey = fs.readFileSync(keyFilename);
        } else {
            console.log(chalk.red(`Error: Key file not found at ${keyFilename}`));
            return;
        }
    } else {
        const defaultKeys = [path.join(os.homedir(), '.ssh', 'id_rsa'), path.join(os.homedir(), '.ssh', 'id_ed25519')];
        const foundKeyPath = defaultKeys.find(p => fs.existsSync(p));
        if (foundKeyPath) {
            privateKey = fs.readFileSync(foundKeyPath);
        }
    }

    const connectionOptions: any = {
        host: host,
        port: 22,
        username: username,
    };

    if (privateKey) {
        connectionOptions.privateKey = privateKey;
    } else {
        connectionOptions.password = getPassword(`Password for ${hostString}: `);
    }

    try {
        conn.connect(connectionOptions);
    } catch (e: any) {
        console.log(chalk.red(`Connection setup error: ${e.message}`));
    }
}

function saveChatToFile(state: AppState) {
    const projectPath = findConfigPath();
    if (!projectPath) {
        console.log(chalk.red('Error: Not in a valid .banjin project directory. Chat not saved.'));
        return;
    }

    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `chat_${timestamp}.md`;
        const filePath = path.join(projectPath, filename);

        let chatContent = '# Chat Log\n\n';
        for (const message of state.conversation) {
            const role = message.role;
            const content = message.content || `\`\`\`json\n${JSON.stringify(message.tool_calls, null, 2)}\n\`\`\``;
            chatContent += `## ${role.toUpperCase()}\n\n${content}\n\n`;
        }
        fs.writeFileSync(filePath, chatContent);
        console.log(chalk.green(`Conversation saved to ${filePath}`));
    } catch (error: any) {
        console.log(chalk.red(`Error saving chat: ${error.message}`));
    }
}

function loadChatFromFile(state: AppState, filename: string) {
    const projectPath = findConfigPath();
    if (!projectPath) {
        console.log(chalk.red('Error: Not in a valid .banjin project directory.'));
        return;
    }

    try {
        const filePath = path.join(projectPath, filename);
        if (!fs.existsSync(filePath)) {
            console.log(chalk.red(`Error: File not found: ${filename}`));
            return;
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const newConversation: any[] = [];
        const sections = fileContent.split('## ').slice(1);

        for (const section of sections) {
            const lines = section.split('\n');
            const role = lines[0].trim().toLowerCase();
            let content = lines.slice(2).join('\n').trim();

            if (role === 'system') {
                continue;
            }

            if (content.startsWith('```json')) {
                content = content.substring(7, content.length - 3);
                newConversation.push({ role: role, tool_calls: JSON.parse(content) });
            } else {
                newConversation.push({ role: role, content: content });
            }
        }

        state.conversation = [state.conversation[0], ...newConversation];
        console.log(chalk.green(`Conversation loaded from ${filename}`));

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.log(chalk.red(`Error loading chat: ${errorMessage}`));
    }
}

function listSavedChats() {
    const projectPath = findConfigPath();
    if (!projectPath) {
        console.log(chalk.yellow('Not in a .banjin project directory. No chats to list.'));
        return;
    }

    try {
        const files = fs.readdirSync(projectPath).filter(file => file.startsWith('chat_') && file.endsWith('.md'));
        if (files.length === 0) {
            console.log(chalk.yellow('No saved chats found in this project.'));
        } else {
            console.log(chalk.yellow('Saved chats:\n') + files.map(f => `  - ${f}`).join('\n'));
        }
    } catch (error: any) {
        console.log(chalk.red(`Could not list chats: ${error.message}`));
    }
}

function deleteChatFile(filename: string) {
    const projectPath = findConfigPath();
    if (!projectPath) {
        console.log(chalk.red('Error: Not in a valid .banjin project directory.'));
        return;
    }

    try {
        const filePath = path.join(projectPath, filename);
        if (!fs.existsSync(filePath)) {
            console.log(chalk.red(`Error: File not found: ${filename}`));
            return;
        }
        fs.unlinkSync(filePath);
        console.log(chalk.green(`Deleted file: ${filename}`));
    } catch (error: any) {
        console.log(chalk.red(`Could not delete file: ${error.message}`));
    }
}

function listLocalFiles(targetPath: string) {
    try {
        const resolvedPath = path.resolve(targetPath);
        if (!fs.existsSync(resolvedPath)) {
            console.log(chalk.red(`Path does not exist: ${targetPath}`));
            return;
        }

        const stats = fs.statSync(resolvedPath);
        if (!stats.isDirectory()) {
            console.log(chalk.red(`Path is not a directory: ${targetPath}`));
            return;
        }

        const files = fs.readdirSync(resolvedPath, { withFileTypes: true });
        const output = files.map(dirent => {
            return dirent.isDirectory() ? chalk.blue(dirent.name + '/') : dirent.name;
        }).join('\n');
        console.log(output || chalk.yellow('(empty directory)'));
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.log(chalk.red(`Error listing files: ${errorMessage}`));
    }
}
