import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'yaml';
import chalk from 'chalk';

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
    const configPath = findConfigPath();
    if (!configPath) {
        console.log(chalk.red.bold('Error: No .banjin configuration directory found.'));
        return null;
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
