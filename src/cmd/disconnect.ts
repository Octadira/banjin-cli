import { AppState } from '../config';
import chalk from 'chalk';

export async function handleDisconnect(state: AppState, _args: string[]): Promise<boolean> {
    if (state.ssh.client) {
        state.ssh.client.end();
        state.ssh.client = null;
        console.log(chalk.yellow(`Disconnected from ${state.ssh.host_string}`));
        state.ssh.host_string = null;
        state.ssh.ssh_alias = null;
    } else {
        console.log(chalk.yellow('Not connected.'));
    }
    return false;
}