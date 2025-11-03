import { AppState } from '../config';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { findConfigPath } from '../config';
import chalk from 'chalk';

export async function handleTimeout(state: AppState, args: string[]): Promise<boolean> {
    if (args.length === 0) {
        // Display current timeout
        const currentTimeout = state.session_config?.cli?.tool_timeout ?? 300;
        const timeoutDisplay = currentTimeout === 0 ? 'disabled (infinite)' : `${currentTimeout} seconds`;
        console.log(chalk.yellow(`Current tool execution timeout: ${timeoutDisplay}`));
        console.log(chalk.dim('Usage: /timeout <seconds> [--save]'));
        console.log(chalk.dim('       /timeout 0            - Disable timeout (infinite wait)'));
        console.log(chalk.dim('       /timeout 300 --save   - Set to 5 minutes and save to config'));
        return false;
    }

    const timeoutValue = parseInt(args[0], 10);
    if (isNaN(timeoutValue) || timeoutValue < 0) {
        console.log(chalk.red('Invalid timeout value. Must be a non-negative number (0 = disabled).'));
        return false;
    }

    if (!state.session_config.cli) state.session_config.cli = {};
    state.session_config.cli.tool_timeout = timeoutValue;

    const displayValue = timeoutValue === 0 ? 'disabled (infinite)' : `${timeoutValue} seconds`;
    console.log(chalk.green(`Tool timeout set to: ${displayValue}`));

    // Save to config file if --save flag is present
    if (args.includes('--save')) {
        try {
            const configPath = findConfigPath();
            if (configPath) {
                const configFile = path.join(configPath, 'config.yaml');
                const configContent = fs.readFileSync(configFile, 'utf8');
                const config = yaml.parse(configContent);
                
                if (!config.cli) config.cli = {};
                config.cli.tool_timeout = timeoutValue;
                
                fs.writeFileSync(configFile, yaml.stringify(config));
                console.log(chalk.green('✓ Saved to config file'));
            }
        } catch (error: any) {
            console.log(chalk.red(`Failed to save to config: ${error.message}`));
        }
    }
    return false;
}