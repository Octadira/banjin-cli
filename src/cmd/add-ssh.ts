import { AppState } from '../config';
import { loadSshServers, saveSshServers } from '../ssh-manager';
import chalk from 'chalk';

export async function handleAddSsh(_state: AppState, args: string[]): Promise<boolean> {
    if (args.length < 2) {
        console.log(chalk.red('Usage: /add-ssh <alias> <user@host> [-i /path/to/key]'));
        return false;
    }
    const [alias, userAtHost] = args;
    const keyIndex = args.indexOf('-i');
    let keyPath: string | undefined;
    if (keyIndex !== -1 && args.length > keyIndex + 1) {
        keyPath = args[keyIndex + 1];
    }

    if (!userAtHost.includes('@')) {
        console.log(chalk.red('Invalid format. Please use <user@host>.'));
        return false;
    }
    const [user, host] = userAtHost.split('@');

    const sshConfig = loadSshServers();
    sshConfig[alias] = { user, host, keyPath };
    if (saveSshServers(sshConfig)) {
        console.log(chalk.green(`SSH server '${alias}' saved.`));
    }
    return false;
}