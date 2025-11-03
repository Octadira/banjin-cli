import { AppState } from '../config';
import { spawn } from 'child_process';
import chalk from 'chalk';

export async function handleExec(_state: AppState, args: string[]): Promise<boolean> {
    if (args.length === 0) {
        console.log(chalk.red('Usage: /exec <command> [args...]'));
        console.log(chalk.dim('Example: /exec ls -la'));
        return false;
    }

    const command = args[0];
    const commandArgs = args.slice(1);

    console.log(chalk.dim(`Executing: ${command} ${commandArgs.join(' ')}`));

    const child = spawn(command, commandArgs, {
        stdio: 'inherit',
        shell: true, // Allow shell commands like 'ls -la' or 'echo hello'
    });

    return new Promise((resolve) => {
        child.on('close', (code) => {
            if (code === 0) {
                console.log(chalk.green(`Command completed successfully.`));
            } else {
                console.log(chalk.red(`Command failed with exit code ${code}.`));
            }
            resolve(false); // Continue the CLI session
        });

        child.on('error', (error) => {
            console.log(chalk.red(`Error executing command: ${error.message}`));
            resolve(false);
        });
    });
}