import { AppState } from '../config';
import chalk from 'chalk';

export async function handleMcpTools(state: AppState, _args: string[]): Promise<boolean> {
    if (state.dynamic_tool_defs.length === 0) {
        console.log(chalk.yellow('No MCP tools were discovered.'));
        return false;
    }
    console.log(chalk.yellow('Discovered MCP Tools:\n'));
    for (const toolDef of state.dynamic_tool_defs) {
        const fullName = toolDef.function.name;
        const parts = fullName.split('_');
        const serverName = parts.shift();
        const originalName = parts.join('_');

        console.log(chalk.bold.cyan(`  Tool: ${fullName}`));
        console.log(chalk.dim(`    - Original Name: ${originalName}`));
        console.log(chalk.dim(`    - Server: ${serverName}`));
        console.log(chalk.dim(`    - Description: ${toolDef.function.description || 'N/A'}`));
    }
    return false;
}