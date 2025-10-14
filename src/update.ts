import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import updateNotifier from 'update-notifier';
import type { Package } from 'update-notifier';
import chalk from 'chalk';
import pkg from '../package.json';

// Define our own update info type to match the actual structure
interface BanjinUpdateInfo {
    name: string;
    current: string;
    latest: string;
    type: 'latest' | 'major' | 'minor' | 'patch';
}

// Ensure type safety for package.json
interface PackageJson {
    name: string;
    version: string;
}

const CACHE_FILE = path.join(os.homedir(), '.banjin', 'update-cache.json');
const CHECK_INTERVAL = 1000 * 60 * 60 * 24; // 1 day

interface Cache {
    lastCheck: number;
    latest: string;
}

async function getUpdateInfo(force: boolean = false): Promise<BanjinUpdateInfo | null> {
    try {
        const configDir = path.join(os.homedir(), '.banjin');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        if (!force && fs.existsSync(CACHE_FILE)) {
            try {
                const cacheContent = fs.readFileSync(CACHE_FILE, 'utf8');
                const cache = JSON.parse(cacheContent) as Cache;
                
                // Validate cache structure
                if (typeof cache.lastCheck !== 'number' || typeof cache.latest !== 'string') {
                    throw new Error('Invalid cache format');
                }

                if (Date.now() - cache.lastCheck < CHECK_INTERVAL) {
                    if (pkg.version !== cache.latest) {
                        const { name, version: current } = pkg as PackageJson;
                        return { 
                            type: 'latest', 
                            name, 
                            current, 
                            latest: cache.latest 
                        };
                    }
                    return null;
                }
            } catch (error) {
                // If cache is corrupted, continue with fresh check
                console.debug('Cache read error:', error instanceof Error ? error.message : 'Unknown error');
            }
        }

        const notifier = updateNotifier({ pkg: pkg as Package });
        const update = await notifier.fetchInfo();

        const newCache: Cache = {
            lastCheck: Date.now(),
            latest: update?.latest || pkg.version,
        };

        try {
            // Atomic write to avoid corruption
            const tempFile = `${CACHE_FILE}.tmp`;
            fs.writeFileSync(tempFile, JSON.stringify(newCache));
            fs.renameSync(tempFile, CACHE_FILE);
        } catch (error) {
            console.debug('Failed to update cache:', error instanceof Error ? error.message : 'Unknown error');
            // Continue even if cache update fails
        }

        if (update && update.latest !== update.current) {
            return {
                type: 'latest',
                name: pkg.name,
                current: pkg.version,
                latest: update.latest
            };
        }

        return null;
    } catch (error) {
        console.debug('Update check failed:', error instanceof Error ? error.message : 'Unknown error');
        return null;
    }
}

export async function notifyOnUpdate(): Promise<void> {
    try {
        const update = await getUpdateInfo();
        if (update) {
            console.log(chalk.yellow(`(A new version (${update.latest}) is available. Run /update for details.)`));
        }
    } catch (error) {
        // Log error but don't show to user since this is a background check
        console.debug('Update notification failed:', error instanceof Error ? error.message : 'Unknown error');
    }
}

export async function forceCheckForUpdate(): Promise<BanjinUpdateInfo | null> {
    try {
        return await getUpdateInfo(true);
    } catch (error) {
        console.error('Update check failed:', error instanceof Error ? error.message : 'Unknown error');
        return null;
    }
}
