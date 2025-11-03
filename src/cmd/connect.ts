import { AppState } from '../config';
import { loadSshServers } from '../ssh-manager';
import { connectSsh } from '../ssh-helpers';
import chalk from 'chalk';

export async function handleConnect(state: AppState, args: string[]): Promise<boolean> {
    if (state.ssh.client) {
        console.log(chalk.red('Already connected. Please /disconnect first.'));
        return false;
    }
    if (args.length === 0) {
        console.log(chalk.red('Usage: /connect <alias | user@hostname> [-i /path/to/key]'));
        return false;
    }
    const connectArg = args[0];
    if (connectArg.includes('@')) {
        // Direct connection (no alias)
        state.ssh.ssh_alias = null;
        connectSsh(state, args);
    } else {
        // Alias connection
        const servers = loadSshServers();
        const server = servers[connectArg];
        if (server) {
            const connectParams = [`${server.user}@${server.host}`];
            if (server.keyPath) {
                connectParams.push('-i', server.keyPath);
            }
            // Set alias before connecting
            state.ssh.ssh_alias = connectArg;
            connectSsh(state, connectParams);
        } else {
            console.log(chalk.red(`Error: SSH alias '${connectArg}' not found.`));
        }
    }
    return false;
}