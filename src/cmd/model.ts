import { AppState } from '../config';
import chalk from 'chalk';

export async function handleModel(state: AppState, args: string[]): Promise<boolean> {
    if (args.length === 0) {
        console.log(chalk.yellow(`Current model: ${state.session_config.llm.model}`));
    } else {
        state.session_config.llm.model = args.join(' ');
        console.log(chalk.yellow(`Model for this session set to: ${state.session_config.llm.model}`));
    }
    return false;
}