import { AppState } from '../config';
import chalk from 'chalk';

export async function handleModelReset(state: AppState, _args: string[]): Promise<boolean> {
    state.session_config.llm.model = state.original_config.llm.model;
    console.log(chalk.yellow(`Model reset to default: ${state.session_config.llm.model}`));
    return false;
}