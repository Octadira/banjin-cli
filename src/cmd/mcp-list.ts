import { AppState } from '../config';
import chalk from 'chalk';

export async function handleMcpList(state: AppState, _args: string[]): Promise<boolean> {
    if (state.mcp_servers && state.mcp_servers.mcpServers) {
        const serverNames = Object.keys(state.mcp_servers.mcpServers);
        console.log(chalk.yellow('Available MCP Servers:\n') + serverNames.map(s => `  - ${s}`).join('\n'));
    } else {
        console.log(chalk.yellow('No MCP servers configured.'));
    }
    return false;
}