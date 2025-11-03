import { AppState } from '../config';
import chalk from 'chalk';

export async function handleContext(state: AppState, _args: string[]): Promise<boolean> {
    if (state.system_context) {
        console.log(chalk.yellow(`System Context:\n---\n${state.system_context}`));
    } else {
        console.log(chalk.yellow('No system context loaded.'));
    }
    return false;
}