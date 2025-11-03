import { AppState } from '../config';
import chalk from 'chalk';

export async function handleTemp(state: AppState, args: string[]): Promise<boolean> {
    if (args.length === 0) {
        console.log(chalk.yellow(`Current temperature: ${state.session_config.llm.temperature}`));
    } else {
        const newTemp = parseFloat(args[0]);
        if (isNaN(newTemp)) {
            console.log(chalk.red('Invalid temperature. Please provide a number.'));
        } else {
            state.session_config.llm.temperature = newTemp;
            console.log(chalk.yellow(`Temperature for this session set to: ${newTemp}`));
        }
    }
    return false;
}