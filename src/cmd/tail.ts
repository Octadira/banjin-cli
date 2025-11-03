import { AppState } from '../config';
import chalk from 'chalk';
import { exec } from 'child_process';

export async function handleTail(state: AppState, args: string[]): Promise<boolean> {
    const usage = () => {
        console.log(chalk.yellow(`\n/tail
  Usage:
    /tail <file> [lines]   - Monitor file in real-time (like tail -f)

  Parameters:
    file     - File to monitor (local or remote)
    lines    - Number of lines to show initially (default: 10)

  Examples:
    /tail /var/log/nginx/access.log
    /tail /var/log/syslog 50
    /tail ./app.log 20

  Controls:
    - Press Ctrl+C to stop monitoring

  Notes:
    - For remote files, requires active SSH connection
    - Shows last N lines initially, then follows new lines
    - Works with both local and remote files`));
    };

    if (!args.length || ['help','-h','--help'].includes(args[0])) {
        usage();
        return false;
    }

    const filePath = args[0];
    const lines = parseInt(args[1]) || 10;

    if (lines < 1) {
        console.log(chalk.red('Error: Lines must be at least 1.'));
        return false;
    }

    console.log(chalk.cyan(`\nMonitoring: ${filePath}`));
    console.log(chalk.dim(`Showing last ${lines} lines, then following...`));
    console.log(chalk.dim('Press Ctrl+C to stop\n'));

    let monitoring = true;

    const cleanup = () => {
        monitoring = false;
        console.log(chalk.yellow('\nStopped monitoring.'));
    };

    process.on('SIGINT', cleanup);

    try {
        if (state.ssh.host_string) {
            // Remote file - use SSH
            const [user, host] = state.ssh.host_string.split('@');
            const tailCommand = `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${user}@${host} "tail -n ${lines} -f '${filePath}'"`;

            const child = exec(tailCommand, (error, stdout, stderr) => {
                if (error && !monitoring) {
                    // Normal exit when stopped
                    return;
                }
                if (error) {
                    console.log(chalk.red(`Error: ${error.message}`));
                }
                if (stderr) {
                    console.log(chalk.red(`stderr: ${stderr}`));
                }
            });

            // Pipe output to console
            if (child.stdout) {
                child.stdout.on('data', (data) => {
                    process.stdout.write(data);
                });
            }

            // Wait for process to end
            return new Promise((resolve) => {
                child.on('close', () => {
                    resolve(false);
                });
            });

        } else {
            // Local file - use tail directly
            const tailCommand = `tail -n ${lines} -f "${filePath}"`;

            const child = exec(tailCommand, (error, stdout, stderr) => {
                if (error && !monitoring) {
                    // Normal exit when stopped
                    return;
                }
                if (error) {
                    console.log(chalk.red(`Error: ${error.message}`));
                }
                if (stderr) {
                    console.log(chalk.red(`stderr: ${stderr}`));
                }
            });

            // Pipe output to console
            if (child.stdout) {
                child.stdout.on('data', (data) => {
                    process.stdout.write(data);
                });
            }

            // Wait for process to end
            return new Promise((resolve) => {
                child.on('close', () => {
                    resolve(false);
                });
            });
        }

    } catch (error: any) {
        console.log(chalk.red(`Failed to start monitoring: ${error.message}`));
        return false;
    }
}