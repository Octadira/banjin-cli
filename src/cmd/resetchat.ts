import { AppState } from '../config';
import chalk from 'chalk';

export async function handleResetchat(state: AppState, _args: string[]): Promise<boolean> {
    state.conversation = state.system_context ? [{ role: 'system', content: state.system_context }] : [];
    console.log(chalk.yellow('Conversation memory has been reset.'));
    return false;
}