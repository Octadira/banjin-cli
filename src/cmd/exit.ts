import { AppState } from '../config';
import { ensureTerminalCleanState } from '../terminal-utils';

export async function handleExit(state: AppState, _args: string[]): Promise<boolean> {
    ensureTerminalCleanState();
    if (state.ssh.client) state.ssh.client.end();
    return true;
}