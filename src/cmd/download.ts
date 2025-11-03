import { AppState } from '../config';
import ora from 'ora';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function handleDownload(state: AppState, args: string[]): Promise<boolean> {
    const usage = () => {
        console.log(chalk.yellow(`\n/download
  Usage:
    /download <remote_file> <local_path>   - Download file from remote server to local

  Examples:
    /download /etc/nginx/nginx.conf ./nginx.conf
    /download /var/log/apache2/error.log /tmp/apache-error.log

  Notes:
    - Requires active SSH connection (/connect first)
    - Uses scp for secure transfer
    - Remote path must be absolute or relative to user's home`));
    };

    if (!args.length || ['help','-h','--help'].includes(args[0])) {
        usage();
        return false;
    }

    if (!state.ssh.host_string) {
        console.log(chalk.red('Error: No active SSH connection. Use /connect first.'));
        return false;
    }

    if (args.length < 2) {
        console.log(chalk.red('Error: Missing arguments. Use /download <remote_file> <local_path>'));
        return false;
    }

    const remoteFile = args[0];
    const localPath = args[1];

    const spinner = ora(`Downloading ${remoteFile} from ${state.ssh.host_string} to ${localPath}...`).start();

    try {
        // Parse host_string to get user and host
        const [user, host] = state.ssh.host_string!.split('@');

        // Use scp to download file
        const scpCommand = `scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "${user}@${host}:${remoteFile}" "${localPath}"`;

        await execAsync(scpCommand);
        spinner.succeed(chalk.green(`Successfully downloaded ${remoteFile} to ${localPath}`));
    } catch (error: any) {
        spinner.fail(chalk.red(`Download failed: ${error.message}`));
        return false;
    }

    return false;
}