import { AppState } from '../config';
import { collectServerProfile } from '../profiling';
import { showProfile } from '../profiling';
import { loadServerProfile, summarizeProfile } from '../profiling';
import ora from 'ora';
import chalk from 'chalk';

export async function handleProfile(state: AppState, args: string[]): Promise<boolean> {
    const sub = args[0];
    const usage = () => {
        console.log(chalk.yellow(`\n/profile
  Usage:
    /profile collect [--light|--full]   - Collect server profile (facts: OS, hardware, services, etc.)
    /profile show [<hostname>]          - Display saved profile
    /profile summarize                  - Show brief summary of profile
    /profile diff <profile1> <profile2> - Diff two profiles (stub)
    /profile send [--dry-run]           - Send summary to LLM context (stub)

  Notes:
    - Profiles saved under ~/.banjin/profiles/
    - Summary is lightweight and safe for LLM context injection.`));
    };

    if (!sub || ['help','-h','--help'].includes(sub)) {
        usage();
        return false;
    }

    switch (sub) {
        case 'collect': {
            const spinner = ora('Collecting server profile...').start();
            try {
                const result = await collectServerProfile(state, { full: true });
                spinner.succeed(chalk.green(result));
            } catch (e: any) {
                spinner.fail(chalk.red(e.message));
            }
            break;
        }
        case 'show': {
            try {
                const hostIdx = args.indexOf('--host');
                
                let hostname: string;
                if (hostIdx !== -1 && args[hostIdx + 1]) {
                    // Format: /profile show --host linode
                    hostname = args[hostIdx + 1];
                } else if (args[1] && !args[1].startsWith('--')) {
                    // Format: /profile show linode (positional argument)
                    hostname = args[1];
                } else if (state.ssh && state.ssh.client) {
                    // Use SSH alias if connected via alias, otherwise use IP/hostname
                    hostname = state.ssh.ssh_alias || (state.ssh.host_string?.split('@')[1] || require('os').hostname());
                } else {
                    hostname = require('os').hostname();
                }
                
                console.log(chalk.green(`Server Profile for ${hostname}:`));
                console.log(showProfile(hostname, state.configPath));
            } catch (e: any) {
                console.log(chalk.red(`Error: ${e.message}`));
            }
            break;
        }
        case 'summarize': {
            try {
                const hostIdx = args.indexOf('--host');
                
                let hostname: string;
                if (hostIdx !== -1 && args[hostIdx + 1]) {
                    // Format: /profile summarize --host linode
                    hostname = args[hostIdx + 1];
                } else if (args[1] && !args[1].startsWith('--')) {
                    // Format: /profile summarize linode (positional argument)
                    hostname = args[1];
                } else if (state.ssh && state.ssh.client) {
                    // Use SSH alias if connected via alias, otherwise use IP/hostname
                    hostname = state.ssh.ssh_alias || (state.ssh.host_string?.split('@')[1] || require('os').hostname());
                } else {
                    hostname = require('os').hostname();
                }
                
                const profile = loadServerProfile(hostname, state.configPath);
                if (!profile) {
                    console.log(chalk.yellow(`No profile found for ${hostname}. Run /profile collect first.`));
                } else {
                    console.log(chalk.green('Profile Summary:'));
                    console.log(summarizeProfile(profile));
                }
            } catch (e: any) {
                console.log(chalk.red(`Error: ${e.message}`));
            }
            break;
        }
        case 'diff':
            console.log(chalk.cyan('[profile:diff] - Stub: diff functionality not yet implemented.'));
            break;
        case 'send':
            console.log(chalk.cyan('[profile:send] - Stub: would inject summary into LLM context.'));
            break;
        default:
            console.log(chalk.red(`Unknown /profile action: ${sub}`));
            usage();
    }
    return false;
}