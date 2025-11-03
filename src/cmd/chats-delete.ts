import { AppState } from '../config';
import { deleteChatFile } from '../chat-helpers';
import chalk from 'chalk';

export async function handleChatsDelete(_state: AppState, args: string[]): Promise<boolean> {
    if (args.length === 0) {
        console.log(chalk.red('Usage: /chats-delete <filename>'));
        return false;
    }
    deleteChatFile(args[0]);
    return false;
}