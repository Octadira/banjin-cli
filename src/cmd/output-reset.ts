import { AppState } from '../config';
import chalk from 'chalk';

export async function handleOutputReset(state: AppState, _args: string[]): Promise<boolean> {
    const defaultFmt = (state.original_config?.cli?.output_format) || 'text';
    if (!state.session_config.cli) state.session_config.cli = {};
    state.session_config.cli.output_format = defaultFmt;
    console.log(chalk.yellow(`Output format reset to default: ${defaultFmt}`));
    return false;
}