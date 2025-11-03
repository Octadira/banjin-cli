import { AppState } from '../config';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'yaml';
import chalk from 'chalk';

export async function handleOutput(state: AppState, args: string[]): Promise<boolean> {
    const allowed = ['markdown', 'text'];
    const hasSave = args.includes('--save') || args.includes('-s');
    const fmtArg = args.find(a => !a.startsWith('-'));

    const current = state.session_config?.cli?.output_format || 'markdown';
    if (!fmtArg) {
        console.log(chalk.yellow(`Current output format: ${current}`));
        console.log(chalk.dim(`Usage: /output <${allowed.join('|')}> [--save]`));
        return false;
    }

    const fmt = fmtArg.toLowerCase();
    if (!allowed.includes(fmt)) {
        console.log(chalk.red(`Invalid output format. Use one of: ${allowed.join(', ')}`));
        return false;
    }

    if (!state.session_config.cli) state.session_config.cli = {};
    state.session_config.cli.output_format = fmt;
    console.log(chalk.yellow(`Output format for this session set to: ${fmt}`));

    if (hasSave) {
        const configFile = path.join(state.configPath, 'config.yaml');
        try {
            const raw = fs.readFileSync(configFile, 'utf8');
            const conf = yaml.parse(raw) || {};
            if (!conf.cli) conf.cli = {};
            conf.cli.output_format = fmt;
            fs.writeFileSync(configFile, yaml.stringify(conf));
            console.log(chalk.green('Output format saved to config.yaml'));
        } catch (e: any) {
            console.log(chalk.red(`Failed to save to config.yaml: ${e.message}`));
        }
    }
    return false;
}