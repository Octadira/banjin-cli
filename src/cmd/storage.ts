import { AppState } from '../config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';

function getDirectorySize(dirPath: string): number {
    let totalSize = 0;
    try {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stat = fs.statSync(itemPath);
            if (stat.isDirectory()) {
                totalSize += getDirectorySize(itemPath);
            } else {
                totalSize += stat.size;
            }
        }
    } catch {}
    return totalSize;
}

function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function pruneOldFiles(dirPath: string, maxAgeDays: number, dryRun: boolean): { deleted: string[], totalSize: number } {
    const deleted: string[] = [];
    let totalSize = 0;
    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

    try {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            try {
                const stat = fs.statSync(itemPath);
                if (stat.isFile() && (now - stat.mtime.getTime()) > maxAgeMs) {
                    totalSize += stat.size;
                    if (!dryRun) {
                        fs.unlinkSync(itemPath);
                    }
                    deleted.push(item);
                }
            } catch {}
        }
    } catch {}
    return { deleted, totalSize };
}

export async function handleStorage(state: AppState, args: string[]): Promise<boolean> {
    const sub = args[0];
    const usage = () => {
        console.log(chalk.yellow(`\n/storage
   Usage:
     /storage stats                        - Show local storage usage by Banjin
     /storage prune [--dry-run] [--days N] - Remove old profiles and audit logs

   Notes:
     - Default prune age: 30 days
     - Use --dry-run to preview without deleting`));
    };
    if (!sub || ['help','-h','--help'].includes(sub)) {
        usage();
        return false;
    }

    const basePath = state.configPath || path.join(os.homedir(), '.banjin');
    const profilesDir = path.join(basePath, 'profiles');
    const auditDir = path.join(basePath, 'audit');

    switch (sub) {
        case 'stats': {
            let totalSize = 0;
            const stats: { [key: string]: number } = {};

            // Calculate profiles size
            if (fs.existsSync(profilesDir)) {
                stats.profiles = getDirectorySize(profilesDir);
                totalSize += stats.profiles;
            }

            // Calculate audit size
            if (fs.existsSync(auditDir)) {
                stats.audit = getDirectorySize(auditDir);
                totalSize += stats.audit;
            }

            // Calculate config size
            if (fs.existsSync(basePath)) {
                const configSize = getDirectorySize(basePath) - (stats.profiles + stats.audit);
                stats.config = configSize;
                totalSize += configSize;
            }

            console.log(chalk.yellow('Banjin Storage Usage:'));
            console.log(`  Profiles: ${formatBytes(stats.profiles || 0)}`);
            console.log(`  Audit logs: ${formatBytes(stats.audit || 0)}`);
            console.log(`  Config: ${formatBytes(stats.config || 0)}`);
            console.log(`  Total: ${formatBytes(totalSize)}`);
            break;
        }
        case 'prune': {
            const dryRun = args.includes('--dry-run');
            const daysIndex = args.indexOf('--days');
            const maxAgeDays = daysIndex !== -1 && args[daysIndex + 1] ? parseInt(args[daysIndex + 1]) : 30;

            if (isNaN(maxAgeDays) || maxAgeDays <= 0) {
                console.log(chalk.red('Invalid days value. Must be a positive number.'));
                return false;
            }

            console.log(chalk.yellow(`${dryRun ? 'DRY RUN: ' : ''}Pruning files older than ${maxAgeDays} days...`));

            let totalDeleted = 0;
            let totalSize = 0;

            // Prune profiles
            if (fs.existsSync(profilesDir)) {
                const { deleted, totalSize: size } = pruneOldFiles(profilesDir, maxAgeDays, dryRun);
                if (deleted.length > 0) {
                    console.log(chalk.green(`Profiles: ${deleted.length} files (${formatBytes(size)})`));
                    totalDeleted += deleted.length;
                    totalSize += size;
                }
            }

            // Prune audit logs
            if (fs.existsSync(auditDir)) {
                const { deleted, totalSize: size } = pruneOldFiles(auditDir, maxAgeDays, dryRun);
                if (deleted.length > 0) {
                    console.log(chalk.green(`Audit logs: ${deleted.length} files (${formatBytes(size)})`));
                    totalDeleted += deleted.length;
                    totalSize += size;
                }
            }

            if (totalDeleted === 0) {
                console.log(chalk.yellow('No old files to prune.'));
            } else {
                console.log(chalk.green(`Total: ${totalDeleted} files pruned (${formatBytes(totalSize)})`));
            }
            break;
        }
        default:
            console.log(chalk.red(`Unknown /storage action: ${sub}`));
            usage();
    }
    return false;
}