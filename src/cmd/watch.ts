import { AppState } from '../config';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';

const execAsync = promisify(exec);

export async function handleWatch(state: AppState, args: string[]): Promise<boolean> {
    const usage = () => {
        console.log(chalk.yellow(`\n/watch
  Usage:
    /watch <command> [interval]   - Execute command repeatedly at intervals

  Parameters:
    command    - Command to execute (can include remote commands with /exec prefix)
    interval   - Interval in seconds (default: 2)

  Examples:
    /watch "ps aux | grep nginx" 5
    /watch "/exec systemctl status nginx" 10
    /watch "df -h" 30

  Controls:
    - Press Ctrl+C to stop watching
    - Press Enter for manual refresh

  Notes:
    - Works with both local and remote commands
    - Default interval is 2 seconds
    - Shows timestamp for each execution`));
    };

    if (!args.length || ['help','-h','--help'].includes(args[0])) {
        usage();
        return false;
    }

    const command = args[0];
    const interval = parseInt(args[1]) || 2;

    if (interval < 1) {
        console.log(chalk.red('Error: Interval must be at least 1 second.'));
        return false;
    }

    console.log(chalk.cyan(`\nWatching: ${command}`));
    console.log(chalk.dim(`Interval: ${interval} seconds`));
    console.log(chalk.dim('Press Ctrl+C to stop, Enter for manual refresh\n'));

    let watching = true;
    let lastOutput = '';

    // Setup readline for manual refresh
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    rl.on('line', () => {
        // Manual refresh on Enter
        executeCommand();
    });

    const cleanup = () => {
        watching = false;
        rl.close();
        console.log(chalk.yellow('\nStopped watching.'));
    };

    process.on('SIGINT', cleanup);

    const executeCommand = async () => {
        try {
            const timestamp = new Date().toLocaleTimeString();
            console.log(chalk.blue(`[${timestamp}] Executing: ${command}`));

            let result: string;

            if (command.startsWith('/exec ')) {
                // Remote command - execute via SSH
                const remoteCommand = command.slice(6).trim();
                if (state.ssh.host_string) {
                    const [user, host] = state.ssh.host_string.split('@');
                    const sshCommand = `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${user}@${host} "${remoteCommand}"`;
                    const { stdout } = await execAsync(sshCommand);
                    result = stdout;
                } else {
                    console.log(chalk.red('No SSH connection for remote command.'));
                    return;
                }
            } else {
                // Local command
                const { stdout } = await execAsync(command);
                result = stdout;
            }

            // Clear previous output if it exists
            if (lastOutput) {
                const lines = lastOutput.split('\n').length;
                readline.moveCursor(process.stdout, 0, -lines);
                readline.clearScreenDown(process.stdout);
            }

            console.log(result.trim());
            lastOutput = result;

        } catch (error: any) {
            console.log(chalk.red(`Error: ${error.message}`));
        }
    };

    // Initial execution
    await executeCommand();

    // Set up interval
    const intervalId = setInterval(async () => {
        if (!watching) {
            clearInterval(intervalId);
            return;
        }
        await executeCommand();
    }, interval * 1000);

    // Wait for user to stop
    return new Promise((resolve) => {
        const checkStop = () => {
            if (!watching) {
                clearInterval(intervalId);
                resolve(false);
            } else {
                setTimeout(checkStop, 100);
            }
        };
        checkStop();
    });
}