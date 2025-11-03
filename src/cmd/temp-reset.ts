import { AppState } from '../config';
import chalk from 'chalk';

export async function handleTempReset(state: AppState, _args: string[]): Promise<boolean> {
    state.session_config.llm.temperature = state.original_config.llm.temperature;
    console.log(chalk.yellow(`Temperature reset to default: ${state.session_config.llm.temperature}`));
    return false;
}