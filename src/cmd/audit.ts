import { AppState } from '../config';
import { tailAuditLog, exportAuditLog } from '../profiling';
import chalk from 'chalk';

export async function handleAudit(state: AppState, args: string[]): Promise<boolean> {
    const sub = args[0];
    const usage = () => {
        console.log(chalk.yellow(`\n/audit
  Usage:
    /audit tail [--lines N] [--host <hostname>]  - Show last N lines of audit log
    /audit show [--host <hostname>]              - Show all audit log entries
    /audit search <pattern> [--host <hostname>]  - Search in audit log (stub)
    /audit export --format json|csv [--host <hostname>]  - Export audit log as JSON or CSV

  Notes:
    - Audit logs saved under ~/.banjin/audit/<hostname>.jsonl
    - Each line is a JSON entry with timestamp, user, action, status.`));
    };

    if (!sub || ['help','-h','--help'].includes(sub)) {
        usage();
        return false;
    }

    switch (sub) {
        case 'tail': {
            try {
                const linesIdx = args.indexOf('--lines');
                const lines = linesIdx !== -1 && args[linesIdx + 1] ? parseInt(args[linesIdx + 1]) : 20;
                const hostIdx = args.indexOf('--host');
                
                let hostname: string;
                if (hostIdx !== -1 && args[hostIdx + 1]) {
                    hostname = args[hostIdx + 1];
                } else if (state.ssh && state.ssh.client) {
                    // Use SSH alias if connected via alias, otherwise use IP/hostname
                    hostname = state.ssh.ssh_alias || (state.ssh.host_string?.split('@')[1] || require('os').hostname());
                } else {
                    hostname = require('os').hostname();
                }
                
                console.log(chalk.green(`Audit Log (${hostname}) - last ${lines} entries:`));
                console.log(chalk.gray(`[Debug: using hostname='${hostname}', configPath='${state.configPath}', ssh_alias='${state.ssh?.ssh_alias || 'null'}']`));
                console.log(tailAuditLog(hostname, lines, state.configPath));
            } catch (e: any) {
                console.log(chalk.red(`Error: ${e.message}`));
            }
            break;
        }
        case 'show': {
            try {
                const hostIdx = args.indexOf('--host');
                
                let hostname: string;
                if (hostIdx !== -1 && args[hostIdx + 1]) {
                    hostname = args[hostIdx + 1];
                } else if (state.ssh && state.ssh.client) {
                    // Use SSH alias if connected via alias, otherwise use IP/hostname
                    hostname = state.ssh.ssh_alias || (state.ssh.host_string?.split('@')[1] || require('os').hostname());
                } else {
                    hostname = require('os').hostname();
                }
                
                console.log(chalk.green(`Audit Log (${hostname}):`));
                console.log(tailAuditLog(hostname, 999999, state.configPath));
            } catch (e: any) {
                console.log(chalk.red(`Error: ${e.message}`));
            }
            break;
        }
        case 'search':
            console.log(chalk.cyan('[audit:search] - Stub: search functionality not yet implemented.'));
            break;
        case 'export': {
            try {
                const formatIdx = args.indexOf('--format');
                const format = (formatIdx !== -1 && args[formatIdx + 1]) ? args[formatIdx + 1] : 'json';
                
                if (!['json', 'csv'].includes(format)) {
                    console.log(chalk.red(`Invalid format: ${format}. Use 'json' or 'csv'.`));
                    break;
                }
                
                const hostIdx = args.indexOf('--host');
                let hostname: string;
                if (hostIdx !== -1 && args[hostIdx + 1]) {
                    hostname = args[hostIdx + 1];
                } else if (state.ssh && state.ssh.client) {
                    // Use SSH alias if connected via alias, otherwise use IP/hostname
                    hostname = state.ssh.ssh_alias || (state.ssh.host_string?.split('@')[1] || require('os').hostname());
                } else {
                    hostname = require('os').hostname();
                }
                
                const exported = exportAuditLog(hostname, format as 'json' | 'csv', state.configPath);
                console.log(exported);
            } catch (e: any) {
                console.log(chalk.red(`Error: ${e.message}`));
            }
            break;
        }
        default:
            console.log(chalk.red(`Unknown /audit action: ${sub}`));
            usage();
    }
    return false;
}