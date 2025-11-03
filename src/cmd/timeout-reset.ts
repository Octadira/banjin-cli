import { AppState } from '../config';
import chalk from 'chalk';

export async function handleTimeoutReset(state: AppState, _args: string[]): Promise<boolean> {
    const defaultTimeout = state.original_config?.cli?.tool_timeout ?? 300;
    if (!state.session_config.cli) state.session_config.cli = {};
    state.session_config.cli.tool_timeout = defaultTimeout;
    const displayValue = defaultTimeout === 0 ? 'disabled (infinite)' : `${defaultTimeout} seconds`;
    console.log(chalk.yellow(`Tool timeout reset to default: ${displayValue}`));
    return false;
}