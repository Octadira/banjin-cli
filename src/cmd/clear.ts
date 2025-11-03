import { AppState } from '../config';

export async function handleClear(_state: AppState, _args: string[]): Promise<boolean> {
    console.clear();
    return false;
}