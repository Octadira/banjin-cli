import { AppState } from '../config';
import { listSavedChats } from '../chat-helpers';

export async function handleChatsList(_state: AppState, _args: string[]): Promise<boolean> {
    listSavedChats();
    return false;
}