import { AppState } from '../config';
import { loadMcpServers, findConfigPath } from '../config';
import chalk from 'chalk';

export async function handleMcpReload(state: AppState, _args: string[]): Promise<boolean> {
    const configPath = findConfigPath();
    if (configPath) {
        state.mcp_servers = loadMcpServers(configPath);
        console.log(chalk.green('MCP servers configuration reloaded.'));
    } else {
        console.log(chalk.red('Could not find .banjin configuration directory.'));
    }
    return false;
}