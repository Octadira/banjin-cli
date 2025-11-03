import { AppState } from '../config';
import { forceCheckForUpdate } from '../update';
import * as readlineSync from 'readline-sync';
import chalk from 'chalk';
import { spawn } from 'child_process';

export async function handleUpdate(_state: AppState, _args: string[]): Promise<boolean> {
    const update = await forceCheckForUpdate();
    if (update) {
        console.log(chalk.yellow(`A new version is available!`));
        console.log(`Current version: ${update.current}`);
        console.log(`Latest version: ${update.latest}`);
        
        const confirm = readlineSync.keyInYN('Would you like to update now?');

        if (confirm) {
            console.log(chalk.dim('Updating...'));
            const child = spawn('npm', ['install', '-g', `${update.name}@latest`], { stdio: 'inherit' });

            child.on('close', (code) => {
                if (code === 0) {
                    console.log(chalk.green('\nUpdate complete! Please restart the application.'));
                } else {
                    console.log(chalk.red(`\nUpdate failed with code ${code}.`));
                }
                process.exit(0);
            });
        } else {
            console.log(chalk.yellow('Update cancelled.'));
        }
    } else {
        console.log(chalk.green('You are already using the latest version.'));
    }
    return false;
}