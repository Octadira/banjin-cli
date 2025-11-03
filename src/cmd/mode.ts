import { AppState } from '../config';
import chalk from 'chalk';

export async function handleMode(state: AppState, args: string[]): Promise<boolean> {
    const allowedModes = ['line', 'editor', 'multiline'];
    if (args.length === 0) {
        console.log(chalk.yellow(`Current input mode: ${state.session_config.cli?.input_mode || 'line'}`));
        console.log(chalk.dim(`Available modes: ${allowedModes.join(', ')}`));
    } else {
        const newMode = args[0];
        if (allowedModes.includes(newMode)) {
            if (!state.session_config.cli) state.session_config.cli = {};
            state.session_config.cli.input_mode = newMode;
            console.log(chalk.yellow(`Input mode for this session set to: ${newMode}`));
        } else {
            console.log(chalk.red(`Invalid mode. Please use one of: ${allowedModes.join(', ')}`));
        }
    }
    return false;
}