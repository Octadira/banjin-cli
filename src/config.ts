import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'yaml';
import chalk from 'chalk';
import confirm from '@inquirer/confirm';
const pkg = require('../package.json');

export interface SSHState {
    client: any; // ssh2 client
    host_string: string | null;
}

export interface AppState {
    original_config: any;
    session_config: any;
    system_context: string;
    conversation: any[];
    ssh: SSHState;
    is_confirming: boolean;
    pending_tool_call: any;
    configPath: string;
    mcp_servers: any;
    loadedContextFiles: string[];
    dynamic_tool_defs: any[];
    dynamic_tool_impls: { [key: string]: (state: AppState, args: any) => Promise<string> };
    mcp_successful_servers: string[];
}

function safeTimestamp(): string {
    return new Date().toISOString().replace(/[:]/g, '-');
}

function copyWithBackup(src: string, dest: string) {
    try {
        if (fs.existsSync(dest)) {
            const backupPath = `${dest}.bak-${safeTimestamp()}`;
            fs.renameSync(dest, backupPath);
            console.log(chalk.dim(`Backup created: ${backupPath}`));
        }
        fs.copyFileSync(src, dest);
    } catch (e: any) {
        console.log(chalk.red(`Failed to copy ${path.basename(src)}: ${e.message}`));
    }
}

async function syncTemplates(configDir: string, options: { promptContext: boolean }) {
    const exampleConfigPath = path.join(__dirname, '..', 'config.example.yaml');
    const contextTemplatePath = path.join(__dirname, '..', 'context.md');

    // Preserve apiKey and CLI settings when updating config.yaml
    if (fs.existsSync(exampleConfigPath)) {
        const cfgTarget = path.join(configDir, 'config.yaml');
        let existingLlm: { apiKey?: string; model?: string; temperature?: number; baseUrl?: string } = {};
        let existingCli: { output_format?: string; input_mode?: string; tool_timeout?: number } = {};
        try {
            if (fs.existsSync(cfgTarget)) {
                const oldYaml = fs.readFileSync(cfgTarget, 'utf8');
                const oldConf = yaml.parse(oldYaml) || {};
                existingLlm = oldConf?.llm || {};
                existingCli = oldConf?.cli || {};
            }
        } catch {}

        // Copy template, then re-inject user's LLM and CLI settings
        copyWithBackup(exampleConfigPath, cfgTarget);
        try {
            const newYaml = fs.readFileSync(cfgTarget, 'utf8');
            const newConf = yaml.parse(newYaml) || {};
            if (!newConf.llm) newConf.llm = {};
            
            // Preserve all LLM settings if they existed and are not default placeholders
            if (existingLlm.apiKey && existingLlm.apiKey !== 'YOUR_API_KEY_HERE') {
                newConf.llm.apiKey = existingLlm.apiKey;
            }
            if (typeof existingLlm.model === 'string' && existingLlm.model !== '') {
                newConf.llm.model = existingLlm.model;
            }
            if (typeof existingLlm.temperature === 'number') {
                newConf.llm.temperature = existingLlm.temperature;
            }
            if (typeof existingLlm.baseUrl === 'string' && existingLlm.baseUrl !== '') {
                newConf.llm.baseUrl = existingLlm.baseUrl;
            }
            
            // Preserve CLI settings if they existed
            if (!newConf.cli) newConf.cli = {};
            if (typeof existingCli.output_format === 'string') {
                newConf.cli.output_format = existingCli.output_format;
            }
            if (typeof existingCli.input_mode === 'string') {
                newConf.cli.input_mode = existingCli.input_mode;
            }
            if (typeof existingCli.tool_timeout === 'number') {
                newConf.cli.tool_timeout = existingCli.tool_timeout;
            }
            fs.writeFileSync(cfgTarget, yaml.stringify(newConf));
            fs.chmodSync(cfgTarget, 0o600);
        } catch {}
    }

    // Prompt before overwriting context.md on updates
    if (fs.existsSync(contextTemplatePath)) {
        const ctxTarget = path.join(configDir, 'context.md');
        let shouldOverwrite = true;
        if (options.promptContext && fs.existsSync(ctxTarget)) {
            shouldOverwrite = await confirm({
                message: 'A new context.md template is available. Overwrite your existing context.md? (Your local changes will be backed up)',
                default: false,
            });
        }

        if (shouldOverwrite) {
            copyWithBackup(contextTemplatePath, ctxTarget);
        }
    }

    // mark version sync (even if user declined context overwrite to avoid repeated prompts)
    try {
        fs.writeFileSync(path.join(configDir, 'last-synced-version'), String(pkg.version));
    } catch {}
}

export function findConfigPath(): string | null {
    const localPath = path.join(process.cwd(), '.banjin');
    // Treat config as initialized only if config.yaml exists inside the directory
    if (fs.existsSync(localPath) && fs.existsSync(path.join(localPath, 'config.yaml'))) return localPath;

    const globalPath = path.join(os.homedir(), '.banjin');
    if (fs.existsSync(globalPath) && fs.existsSync(path.join(globalPath, 'config.yaml'))) return globalPath;

    return null;
}

async function setupConfiguration(): Promise<string | null> {
    console.log(chalk.yellow('Welcome to Banjin! It looks like this is your first time.'));
    const createConfig = await confirm({
        message: 'No configuration directory found. Would you like to create one at ~/.banjin?',
        default: true,
    });

    if (createConfig) {
        const globalPath = path.join(os.homedir(), '.banjin');
        try {
            fs.mkdirSync(globalPath, { recursive: true });
            
            const exampleConfigPath = path.join(__dirname, '..', 'config.example.yaml');
            const exampleMcpPath = path.join(__dirname, '..', 'mcp-servers.example.json');
            const contextTemplatePath = path.join(__dirname, '..', 'context.md');

            const cfgTarget = path.join(globalPath, 'config.yaml');
            fs.copyFileSync(exampleConfigPath, cfgTarget);
            // Secure the API key file by default
            try {
                fs.chmodSync(cfgTarget, 0o600);
            } catch {}

            fs.copyFileSync(exampleMcpPath, path.join(globalPath, 'mcp-servers.json'));
            if (fs.existsSync(contextTemplatePath)) {
                fs.copyFileSync(contextTemplatePath, path.join(globalPath, 'context.md'));
            }

            // Create empty SSH servers registry if missing
            const sshServersPath = path.join(globalPath, 'ssh-servers.json');
            if (!fs.existsSync(sshServersPath)) {
                fs.writeFileSync(sshServersPath, JSON.stringify({}, null, 2));
            }

            // Record version sync on install
            try { fs.writeFileSync(path.join(globalPath, 'last-synced-version'), String(pkg.version)); } catch {}

            console.log(chalk.green(`Successfully created configuration at ${globalPath}`));
            console.log(chalk.yellow.bold('IMPORTANT: Please open ~/.banjin/config.yaml and add your API key.'));
            console.log(chalk.yellow('You can also customize your global instructions in ~/.banjin/context.md'));
            return globalPath;
        } catch (error: any) { 
            console.log(chalk.red(`Could not create configuration: ${error.message}`));
            return null;
        }
    } else {
        console.log(chalk.yellow('Configuration setup cancelled.'));
        return null;
    }
}

function loadConfig(configPath: string): any {
    const configFile = path.join(configPath, 'config.yaml');
    if (!fs.existsSync(configFile)) {
        throw new Error(`Config file not found: ${configFile}. Please ensure it exists or run setup again.`);
    }
    return yaml.parse(fs.readFileSync(configFile, 'utf8'));
}

export function loadMcpServers(configPath: string): any {
    const mcpServersFile = path.join(configPath, 'mcp-servers.json');
    if (!fs.existsSync(mcpServersFile)) return null;
    return JSON.parse(fs.readFileSync(mcpServersFile, 'utf8'));
}

export async function loadInitialState(): Promise<AppState | null> {
    let configPath = findConfigPath();
    if (!configPath) {
        // If ~/.banjin exists but without config.yaml (e.g., created by update cache), run setup
        const possibleDir = fs.existsSync(path.join(process.cwd(), '.banjin'))
            ? path.join(process.cwd(), '.banjin')
            : path.join(os.homedir(), '.banjin');
        const hasDirNoConfig = fs.existsSync(possibleDir) && !fs.existsSync(path.join(possibleDir, 'config.yaml'));

        if (hasDirNoConfig) {
            console.log(chalk.yellow('A Banjin directory was found without a config.yaml. Running first-time setup...'));
        }

        configPath = await setupConfiguration();
        if (!configPath) {
            return null;
        }
    }

    try {
        // On every app start, if version changed since last sync, overwrite templates with backups
        const lastSyncedPath = path.join(configPath, 'last-synced-version');
        let lastSynced = '';
        if (fs.existsSync(lastSyncedPath)) {
            try { lastSynced = fs.readFileSync(lastSyncedPath, 'utf8').trim(); } catch {}
        }

        if (String(pkg.version) !== lastSynced) {
            console.log(chalk.dim(`Syncing templates for version ${pkg.version} (previous: ${lastSynced || 'none'})`));
            await syncTemplates(configPath, { promptContext: true });
        }

        const config = loadConfig(configPath);
        const mcp_servers = loadMcpServers(configPath);
        const loadedContextFiles: string[] = [];

        const globalContextPath = path.join(os.homedir(), '.banjin', 'context.md');
        const localContextPath = path.join(process.cwd(), 'context.md');

        let globalContext = '';
        if (fs.existsSync(globalContextPath)) {
            globalContext = fs.readFileSync(globalContextPath, 'utf8');
            loadedContextFiles.push(globalContextPath);
        }

        let localContext = '';
        if (fs.existsSync(localContextPath) && globalContextPath !== localContextPath) {
            localContext = fs.readFileSync(localContextPath, 'utf8');
            loadedContextFiles.push(localContextPath);
        }

        const system_context = [globalContext, localContext].filter(c => c.trim() !== '').join('\n\n---\n\n');

        const initialState: AppState = {
            original_config: JSON.parse(JSON.stringify(config)),
            session_config: config,
            system_context: system_context,
            conversation: system_context ? [{ role: 'system', content: system_context }] : [],
            ssh: { client: null, host_string: null },
            is_confirming: false,
            pending_tool_call: null,
            configPath: configPath,
            mcp_servers: mcp_servers,
            loadedContextFiles: loadedContextFiles,
            dynamic_tool_defs: [],
            dynamic_tool_impls: {},
            mcp_successful_servers: [],
        };
        return initialState;
    } catch (e: any) {
        console.log(chalk.red.bold(`Error loading configuration: ${e.message}`));
        console.log(chalk.yellow('Please check your configuration files or run setup again.'));
        return null;
    }
}
