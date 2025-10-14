import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'yaml';
import chalk from 'chalk';
import inquirer from 'inquirer';

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
}

export function findConfigPath(): string | null {
    const localPath = path.join(process.cwd(), '.banjin');
    if (fs.existsSync(localPath)) return localPath;
    const globalPath = path.join(os.homedir(), '.banjin');
    if (fs.existsSync(globalPath)) return globalPath;
    return null;
}

async function setupConfiguration(): Promise<string | null> {
    console.log(chalk.yellow('Welcome to Banjin! It looks like this is your first time.'));
    const answers = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'createConfig',
            message: 'No configuration directory found. Would you like to create one at ~/.banjin?',
            default: true,
        },
    ]);

    if (answers.createConfig) {
        const globalPath = path.join(os.homedir(), '.banjin');
        try {
            fs.mkdirSync(globalPath, { recursive: true });
            const exampleConfigPath = path.join(__dirname, '..', 'config.example.yaml');
            const exampleMcpPath = path.join(__dirname, '..', 'mcp-servers.example.json');

            fs.copyFileSync(exampleConfigPath, path.join(globalPath, 'config.yaml'));
            fs.copyFileSync(exampleMcpPath, path.join(globalPath, 'mcp-servers.json'));

            console.log(chalk.green(`Successfully created configuration at ${globalPath}`));
            console.log(chalk.yellow.bold('IMPORTANT: Please open ~/.banjin/config.yaml and add your API key.'));
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
    if (!fs.existsSync(configFile)) throw new Error(`Config file not found: ${configFile}`);
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
        configPath = await setupConfiguration();
        if (!configPath) {
            return null;
        }
    }

    try {
        const config = loadConfig(configPath);
        const mcp_servers = loadMcpServers(configPath);

        // New combined context logic
        const globalContextPath = path.join(os.homedir(), '.banjin', 'context.md');
        const localContextPath = path.join(process.cwd(), '.banjin', 'context.md');

        let globalContext = '';
        if (fs.existsSync(globalContextPath)) {
            globalContext = fs.readFileSync(globalContextPath, 'utf8');
        }

        let localContext = '';
        if (fs.existsSync(localContextPath)) {
            localContext = fs.readFileSync(localContextPath, 'utf8');
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
            configPath: configPath, // This still points to the primary config dir
            mcp_servers: mcp_servers,
        };
        return initialState;
    } catch (e: any) {
        console.log(chalk.red.bold(`Error loading configuration: ${e.message}`));
        return null;
    }
}
