import { AppState } from '../config';
import chalk from 'chalk';

export async function handleStatus(state: AppState, _args: string[]): Promise<boolean> {
    if (state.ssh.client) {
        console.log(chalk.green(`Connected to ${state.ssh.host_string}`));
    } else {
        console.log(chalk.yellow('Not connected to any server.'));
    }
    return false;
}