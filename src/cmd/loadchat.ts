import { AppState } from '../config';
import { loadChatFromFile } from '../chat-helpers';
import chalk from 'chalk';

export async function handleLoadchat(state: AppState, args: string[]): Promise<boolean> {
    if (args.length === 0) {
        console.log(chalk.red('Usage: /loadchat <filename>'));
        return false;
    }
    loadChatFromFile(state, args[0]);
    return false;
}