import { AppState } from '../config';
import { listLocalFiles } from '../file-helpers';

export async function handleLsFiles(_state: AppState, args: string[]): Promise<boolean> {
    const targetPath = args[0] || '.';
    listLocalFiles(targetPath);
    return false;
}