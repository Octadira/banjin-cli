import { AppState } from '../config';
import { loadSshServers, saveSshServers } from '../ssh-manager';
import chalk from 'chalk';

export async function handleRmSsh(_state: AppState, args: string[]): Promise<boolean> {
    if (args.length === 0) {
        console.log(chalk.red('Usage: /rm-ssh <alias>'));
        return false;
    }
    const aliasToRemove = args[0];
    const sshConfigToRemove = loadSshServers();
    if (sshConfigToRemove[aliasToRemove]) {
        delete sshConfigToRemove[aliasToRemove];
        if (saveSshServers(sshConfigToRemove)) {
            console.log(chalk.green(`SSH server '${aliasToRemove}' removed.`));
        }
    } else {
        console.log(chalk.red(`Error: SSH alias '${aliasToRemove}' not found.`));
    }
    return false;
}