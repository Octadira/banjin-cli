import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { findConfigPath } from './config';

export interface SshServer {
    user: string;
    host: string;
    keyPath?: string; // Path is optional
}

export interface SshServerConfig {
    [alias: string]: SshServer;
}

function getSshConfigPath(): string | null {
    const configDir = findConfigPath();
    return configDir ? path.join(configDir, 'ssh-servers.json') : null;
}

export function loadSshServers(): SshServerConfig {
    const configPath = getSshConfigPath();
    if (!configPath || !fs.existsSync(configPath)) {
        return {}; // Return empty config if file doesn't exist
    }
    try {
        const rawData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(rawData) as SshServerConfig;
    } catch (error) {
        console.error('Error reading or parsing ssh-servers.json:', error);
        return {};
    }
}

export function saveSshServers(config: SshServerConfig): boolean {
    const configPath = getSshConfigPath();
    if (!configPath) {
        console.error('Could not find .banjin configuration directory.');
        return false;
    }
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing to ssh-servers.json:', error);
        return false;
    }
}
