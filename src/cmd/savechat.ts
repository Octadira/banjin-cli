import { AppState } from '../config';
import { saveChatToFile } from '../chat-helpers';

export async function handleSavechat(state: AppState, _args: string[]): Promise<boolean> {
    saveChatToFile(state);
    return false;
}