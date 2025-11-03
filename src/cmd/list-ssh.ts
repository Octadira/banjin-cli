import { AppState } from '../config';
import { loadSshServers } from '../ssh-manager';
import chalk from 'chalk';

export async function handleListSsh(_state: AppState, _args: string[]): Promise<boolean> {
    const servers = loadSshServers();
    if (Object.keys(servers).length === 0) {
        console.log(chalk.yellow('No saved SSH servers.'));
        return false;
    }
    console.log(chalk.yellow('Saved SSH Servers:\n'));
    for (const alias in servers) {
        const server = servers[alias];
        const keyInfo = server.keyPath ? `(key: ${server.keyPath})` : '(password/default key)';
        console.log(`  - ${chalk.bold(alias)}: ${server.user}@${server.host} ${chalk.dim(keyInfo)}`);
    }
    return false;
}