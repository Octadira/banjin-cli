import { AppState } from '../config';
import ora from 'ora';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

export async function handleUpload(state: AppState, args: string[]): Promise<boolean> {
    const usage = () => {
        console.log(chalk.yellow(`\n/upload
  Usage:
    /upload <local_file> <remote_path>   - Upload file from local to remote server

  Examples:
    /upload ./config.yaml /home/user/config.yaml
    /upload /tmp/backup.tar.gz /var/backups/backup.tar.gz

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
        console.log(chalk.red('Error: Missing arguments. Use /upload <local_file> <remote_path>'));
        return false;
    }

    const localFile = args[0];
    const remotePath = args[1];

    // Check if local file exists
    if (!fs.existsSync(localFile)) {
        console.log(chalk.red(`Error: Local file '${localFile}' does not exist.`));
        return false;
    }

    const spinner = ora(`Uploading ${localFile} to ${state.ssh.host_string}:${remotePath}...`).start();

    try {
        // Parse host_string to get user and host
        const [user, host] = state.ssh.host_string!.split('@');

        // Use scp to upload file
        const scpCommand = `scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "${localFile}" "${user}@${host}:${remotePath}"`;

        await execAsync(scpCommand);
        spinner.succeed(chalk.green(`Successfully uploaded ${localFile} to ${remotePath}`));
    } catch (error: any) {
        spinner.fail(chalk.red(`Upload failed: ${error.message}`));
        return false;
    }

    return false;
}