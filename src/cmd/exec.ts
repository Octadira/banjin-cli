import { AppState } from '../config';
import { run_command } from '../tools';
import chalk from 'chalk';

export async function handleExec(state: AppState, args: string[]): Promise<boolean> {
    if (args.length === 0) {
        console.log(chalk.red('Usage: /exec <command> [args...]'));
        console.log(chalk.dim('Example: /exec ls -la'));
        return false;
    }

    const cmd = args; // Pass all args as command array

    // Determine execution context
    const isRemote = state.ssh.host_string !== null;
    const context = isRemote ? `on ${state.ssh.host_string}` : 'locally';

    console.log(chalk.dim(`Executing ${context}: ${args.join(' ')}`));

    try {
        const result = await run_command(state, { cmd });

        // Display the result
        console.log(result);

        // Check if command was successful (basic check)
        if (result.includes('failed') || result.includes('Error')) {
            console.log(chalk.red('Command execution completed with issues.'));
        } else {
            console.log(chalk.green('Command completed successfully.'));
        }

    } catch (error) {
        console.log(chalk.red(`Error executing command: ${error instanceof Error ? error.message : String(error)}`));
    }

    return false; // Continue the CLI session
}