/**
 * Server profiling and audit logging module.
 * Collects lightweight server facts, manages profiles, and maintains audit logs.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ServerProfile, ActionLogEntry } from './types/profiling';
import { run_command } from './tools';
import { AppState } from './config';

/**
 * Collect comprehensive server facts (OS, hardware, services, network, security, performance, etc.)
 * If SSH connected, collect from remote server. Otherwise, collect locally.
 * Uses SSH alias as profile ID if available, otherwise uses IP/hostname.
 */
export async function collectServerProfile(state: AppState, _args: any): Promise<string> {
    try {
        const isFull = true; // Always collect full profile
        
        // Determine if we're collecting locally or remotely
        const isRemote = state.ssh && state.ssh.client;
        
        // Profile ID: prefer SSH alias, then IP/hostname
        let profileId: string;
        if (isRemote) {
            if (state.ssh.ssh_alias) {
                // Use alias if connected via alias
                profileId = state.ssh.ssh_alias;
            } else {
                // Use IP/hostname if connected directly
                profileId = state.ssh.host_string?.split('@')[1] || os.hostname();
            }
        } else {
            // Local profile uses local hostname
            profileId = os.hostname();
        }

        const profile: ServerProfile = {
            id: profileId,
            collectedAt: new Date().toISOString(),
            hardware: {
                cpu: 'unknown',
                cores: 0,
                ram_gb: 0,
                disk_gb: 0,
                disks: []
            },
            os: {
                name: isRemote ? 'unknown (remote)' : os.type(),
                version: 'unknown',
                kernel: 'unknown',
                arch: 'unknown'
            },
            users: [],
            services: [],
            network: {
                hostname: profileId,
                interfaces: []
            }
        };

        // Try to get OS info via uname (works locally and remotely)
        try {
            const unameS = await run_command(state, { cmd: ['uname', '-s'] });
            profile.os.name = unameS.trim() || profile.os.name;
        } catch {}

        // Try to get better OS name via lsb_release (Linux distributions)
        try {
            const lsbOutput = await run_command(state, { cmd: ['lsb_release', '-d'] });
            const match = lsbOutput.match(/Description:\s*(.+)/);
            if (match && match[1]) {
                profile.os.name = match[1].trim();
            }
        } catch {}

        try {
            const unameR = await run_command(state, { cmd: ['uname', '-r'] });
            profile.os.version = unameR.trim() || profile.os.version;
            profile.os.kernel = unameR.trim() || profile.os.kernel;
        } catch {}

        try {
            const unameM = await run_command(state, { cmd: ['uname', '-m'] });
            profile.os.arch = unameM.trim() || profile.os.arch;
        } catch {}

        // Try to get CPU info via lscpu or sysctl (remote-friendly)
        try {
            const lscpuOutput = await run_command(state, { cmd: ['lscpu'] });
            const cpuLine = lscpuOutput.split('\n').find(l => l.includes('Model name'));
            if (cpuLine) {
                profile.hardware.cpu = cpuLine.split(':')[1]?.trim() || profile.hardware.cpu;
            }
            const coresLine = lscpuOutput.split('\n').find(l => l.includes('CPU(s):'));
            if (coresLine) {
                profile.hardware.cores = parseInt(coresLine.split(':')[1]?.trim() || '0') || 0;
            }
        } catch {}

        // Try to get RAM info via free -h (remote-friendly)
        try {
            const freeOutput = await run_command(state, { cmd: ['free', '-h'] });
            const memLine = freeOutput.split('\n').find(l => l.includes('Mem:'));
            if (memLine) {
                const parts = memLine.split(/\s+/);
                if (parts[1]) {
                    const ramStr = parts[1].replace('G', '').replace('M', '');
                    profile.hardware.ram_gb = parts[1].includes('G') ? parseInt(ramStr) : Math.round(parseInt(ramStr) / 1024);
                }
            }
        } catch {}

        // Try to get disk info via df
        try {
            const dfOutput = await run_command(state, { cmd: ['df', '-h', '-P'] });
            const lines = dfOutput.split('\n').slice(1);
            for (const line of lines.slice(0, 5)) {
                const parts = line.split(/\s+/);
                if (parts.length >= 6) {
                    profile.hardware.disks.push({
                        mount: parts[5],
                        size_gb: parseInt(parts[1]) || 0,
                        used_gb: parseInt(parts[2]) || 0
                    });
                }
            }
        } catch {}

        // Try to get network interfaces (only local)
        if (!isRemote) {
            try {
                const interfaces = os.networkInterfaces();
                for (const [name, addrs] of Object.entries(interfaces)) {
                    if (addrs) {
                        for (const addr of addrs) {
                            if (addr.family === 'IPv4') {
                                profile.network.interfaces.push({
                                    name,
                                    ip: addr.address,
                                    mac: addr.mac || 'unknown'
                                });
                                break;
                            }
                        }
                    }
                }
            } catch {}
        }
        // Try to get running services
        try {
            const servicesOutput = await run_command(state, { cmd: ['ps', 'aux'] });
            const lines = servicesOutput.split('\n').slice(1, 11);
            profile.services = lines.map(line => {
                const parts = line.split(/\s+/);
                return {
                    name: parts[10] || 'unknown',
                    status: 'active' as const
                };
            });
        } catch {}

        // ===== FULL MODE EXPANSION =====
        if (isFull) {
            // Get systemd services (more detailed than ps aux)
            try {
                profile.services = await getSystemdServices(state);
            } catch {}

            // Get network details
            try {
                profile.network.listening_ports = await getListeningPorts(state);
                profile.network.open_connections = 0; // Placeholder
            } catch {}

            // Security information
            try {
                const fw = await getFirewallStatus(state);
                const ssh = await getSshConfigInfo(state);
                profile.security = {
                    firewall_status: fw.status,
                    firewall_enabled: fw.enabled,
                    ssh_port: ssh.port,
                    ssh_root_login: ssh.root_login,
                    selinux_status: 'unknown',
                    failed_services: await getFailedServices(state)
                };
            } catch {}

            // Performance metrics
            try {
                const perf = await getPerformanceMetrics(state);
                if (perf) {
                    profile.performance = perf;
                }
            } catch {}

            // Additional performance data
            try {
                if (profile.performance) {
                    profile.performance.disk_io = 'unknown'; // Placeholder for disk I/O
                }
            } catch {}

            // Kernel info and uptime
            try {
                const unameA = await run_command(state, { cmd: ['uname', '-a'] });
                const uptimeOutput = await run_command(state, { cmd: ['uptime'] });
                const loadMatch = uptimeOutput.match(/load average: ([0-9.]+), ([0-9.]+), ([0-9.]+)/);
                profile.kernel_info = {
                    kernel_version: unameA.trim(),
                    boot_time: 'unknown',
                    uptime: uptimeOutput.split(' up ')[1]?.split(',')[0] || 'unknown',
                    load_average: loadMatch ? [parseFloat(loadMatch[1]), parseFloat(loadMatch[2]), parseFloat(loadMatch[3])] : [0, 0, 0]
                };
            } catch {}

            // Recent alerts
            try {
                profile.recent_alerts = {
                    error_count_1h: 0,
                    failed_services: await getFailedServices(state),
                    failed_login_count_1h: await getRecentFailedLogins(state),
                    last_error: undefined
                };
            } catch {}
        }

        // Save profile to state.configPath/profiles/
        const profilesDir = path.join(state.configPath || path.join(os.homedir(), '.banjin'), 'profiles');
        fs.mkdirSync(profilesDir, { recursive: true });
        const profilePath = path.join(profilesDir, `${profile.id}.json`);
        fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));

        // Log this action to audit trail
        const auditDir = path.join(state.configPath || path.join(os.homedir(), '.banjin'), 'audit');
        fs.mkdirSync(auditDir, { recursive: true });
        logAction(profile.id, {
            user: 'system',
            host: profile.id,
            action: 'profile_collected',
            details: 'Profile collected (full)',
            status: 'success'
        }, state.configPath);

        const auditPath = path.join(auditDir, `${profile.id}.jsonl`);
        return `Profile collected and saved to ${profilePath}. Audit logged to ${auditPath}`;
    } catch (error: any) {
        return `Error collecting profile: ${error.message}`;
    }
}

/**
 * Load server profile from disk
 */
export function loadServerProfile(hostname: string = os.hostname(), configPath?: string): ServerProfile | null {
    try {
        const basePath = configPath || path.join(os.homedir(), '.banjin');
        const profilesDir = path.join(basePath, 'profiles');
        const profilePath = path.join(profilesDir, `${hostname}.json`);

        if (fs.existsSync(profilePath)) {
            const data = fs.readFileSync(profilePath, 'utf8');
            return JSON.parse(data) as ServerProfile;
        }
    } catch {}
    return null;
}

/**
 * Generate a brief summary of the profile for injection into system context
 */
export function summarizeProfile(profile: ServerProfile): string {
    const disksInfo = profile.hardware.disks
        .map(d => `${d.mount}: ${d.size_gb}GB (${d.used_gb}GB used)`)
        .join(', ');
    const servicesInfo = profile.services
        .slice(0, 5)
        .map(s => s.name)
        .join(', ');
    
    let summary = `Server Facts: ${profile.os.name} ${profile.os.version} (${profile.hardware.cores} cores, ${profile.hardware.ram_gb}GB RAM). Disks: ${disksInfo || 'N/A'}. Services: ${servicesInfo || 'N/A'}.`;
    
    if (profile.tags && profile.tags.length > 0) {
        summary += ` Tags: [${profile.tags.join(', ')}].`;
    }
    
    if (profile.notes && profile.notes.trim().length > 0) {
        summary += ` Notes: ${profile.notes}`;
    }
    
    return summary;
}

/**
 * Hybrid Mode: 3 scenarios with user interaction
 * 1. Auto-save: LLM says "save" → auto-saves notes to profile
 * 2. Suggest note: LLM detects issue → shows popup (yes/no/edit)
 * 3. Suggest action: LLM detects problem → shows action plan (yes/no)
 */

export interface ProfileSuggestion {
    hostname: string;
    currentNotes: string;
    proposedNote: string;
    currentTags: string[];
    proposedTags: string[];
    configPath?: string;
}

export interface ActionPlan {
    hostname: string;
    title: string; // "Update system packages", "Rotate SSH keys", etc.
    description: string; // Plain language explanation for humans
    steps: string[]; // Step-by-step instructions
    estimatedTime: string; // "5 minutes", "30 minutes", etc.
    risk: 'low' | 'medium' | 'high'; // Risk assessment
    configPath?: string;
}

export function createProfileSuggestion(hostname: string, note: string, tags?: string[], configPath?: string): ProfileSuggestion {
    const profile = loadServerProfile(hostname, configPath);
    
    return {
        hostname,
        currentNotes: profile?.notes || '',
        proposedNote: note,
        currentTags: profile?.tags || [],
        proposedTags: tags || [],
        configPath
    };
}

/**
 * Apply a profile suggestion (actually save it)
 */
export function applyProfileSuggestion(suggestion: ProfileSuggestion): string {
    try {
        const profile = loadServerProfile(suggestion.hostname, suggestion.configPath);
        if (!profile) {
            return `Profile not found for ${suggestion.hostname}. Run /profile collect first.`;
        }

        // Apply note
        if (suggestion.proposedNote && suggestion.proposedNote.trim()) {
            profile.notes = profile.notes ? `${profile.notes}\n---\n${suggestion.proposedNote}` : suggestion.proposedNote;
        }

        // Apply tags
        if (suggestion.proposedTags && suggestion.proposedTags.length > 0) {
            profile.tags = [...new Set([...(profile.tags || []), ...suggestion.proposedTags])];
        }

        // Save updated profile back to disk
        const basePath = suggestion.configPath || path.join(os.homedir(), '.banjin');
        const profilesDir = path.join(basePath, 'profiles');
        
        // Find which file to update (prefer .full > .light > plain)
        const candidates = [
            path.join(profilesDir, `${suggestion.hostname}.full.json`),
            path.join(profilesDir, `${suggestion.hostname}.light.json`),
            path.join(profilesDir, `${suggestion.hostname}.json`)
        ];
        
        let savedPath = candidates[2]; // Default to plain
        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) {
                savedPath = candidate;
                break;
            }
        }
        
        fs.writeFileSync(savedPath, JSON.stringify(profile, null, 2));
        
        const appliedInfo = [];
        if (suggestion.proposedNote && suggestion.proposedNote.trim()) appliedInfo.push(`note: "${suggestion.proposedNote}"`);
        if (suggestion.proposedTags && suggestion.proposedTags.length > 0) appliedInfo.push(`tags: [${suggestion.proposedTags.join(', ')}]`);
        
        return `Profile updated for ${suggestion.hostname} with ${appliedInfo.join(', ')}. Saved to ${savedPath}`;
    } catch (error: any) {
        return `Error applying suggestion: ${error.message}`;
    }
}

/**
 * Log an action to the audit trail
 * Assumes audit directory already exists (created by caller)
 * If directory missing, will fail with visible error instead of silent
 */
export function logAction(hostname: string, entry: Omit<ActionLogEntry, 'timestamp'>, configPath?: string): void {
    try {
        const basePath = configPath || path.join(os.homedir(), '.banjin');
        const auditDir = path.join(basePath, 'audit');
        
        // Ensure directory exists (safeguard, should already be created)
        if (!fs.existsSync(auditDir)) {
            fs.mkdirSync(auditDir, { recursive: true });
        }
        
        const auditPath = path.join(auditDir, `${hostname}.jsonl`);

        const logEntry: ActionLogEntry = {
            timestamp: new Date().toISOString(),
            ...entry
        };

        fs.appendFileSync(auditPath, JSON.stringify(logEntry) + '\n');
    } catch (e) {
        // Log error instead of silently ignoring
        console.error(`[Audit Log Warning] Failed to log action for ${hostname}: ${e instanceof Error ? e.message : String(e)}`);
    }
}

/**
 * Tail audit log
 */
export function tailAuditLog(hostname: string, lines: number = 20, configPath?: string): string {
    try {
        const basePath = configPath || path.join(os.homedir(), '.banjin');
        const auditPath = path.join(basePath, 'audit', `${hostname}.jsonl`);
        if (!fs.existsSync(auditPath)) {
            // Show more debug info about what path was checked
            return `No audit log found for ${hostname} (checked: ${auditPath})`;
        }

        const content = fs.readFileSync(auditPath, 'utf8');
        const entries = content.split('\n').filter(l => l.trim());
        const tail = entries.slice(-lines);

        return tail
            .map(line => {
                try {
                    const entry = JSON.parse(line) as ActionLogEntry;
                    return `[${entry.timestamp}] ${entry.user}@${entry.host}: ${entry.action} - ${entry.status}`;
                } catch {
                    return line;
                }
            })
            .join('\n');
    } catch (error: any) {
        return `Error reading audit log: ${error.message}`;
    }
}

/**
 * Export audit log in JSON or CSV format
 */
export function exportAuditLog(hostname: string, format: 'json' | 'csv' = 'json', configPath?: string): string {
    try {
        const basePath = configPath || path.join(os.homedir(), '.banjin');
        const auditPath = path.join(basePath, 'audit', `${hostname}.jsonl`);
        if (!fs.existsSync(auditPath)) {
            return format === 'json'
                ? JSON.stringify({ error: `No audit log found for ${hostname}` })
                : `Error,"No audit log found for ${hostname}"`;
        }

        const content = fs.readFileSync(auditPath, 'utf8');
        const entries = content
            .split('\n')
            .filter(l => l.trim())
            .map(line => {
                try {
                    return JSON.parse(line) as ActionLogEntry;
                } catch {
                    return null;
                }
            })
            .filter(e => e !== null) as ActionLogEntry[];

        if (format === 'json') {
            return JSON.stringify(entries, null, 2);
        } else if (format === 'csv') {
            if (entries.length === 0) {
                return 'timestamp,user,host,action,details,status';
            }
            const headers = 'timestamp,user,host,action,details,status';
            const rows = entries.map(e => {
                const details = (e.details || '').replace(/"/g, '""');
                return `"${e.timestamp}","${e.user}","${e.host}","${e.action}","${details}","${e.status}"`;
            });
            return [headers, ...rows].join('\n');
        }

        return format === 'json'
            ? JSON.stringify({ error: `Unsupported format: ${format}` })
            : `Error,"Unsupported format: ${format}"`;
    } catch (error: any) {
        return format === 'json'
            ? JSON.stringify({ error: `Error exporting audit log: ${error.message}` })
            : `Error,"Error exporting audit log: ${error.message}"`;
    }
}

/**
 * FULL MODE: Extract systemd services (not just ps aux)
 */
async function getSystemdServices(state: AppState): Promise<Array<{ name: string; status: 'active' | 'inactive' | 'failed'; port?: number }>> {
    try {
        const output = await run_command(state, { cmd: ['systemctl', 'list-units', '--all', '--no-pager'] });
        const lines = output.split('\n');
        
        // Skip header (first line) and footer (last 3 lines)
        const dataLines = lines.slice(1, -3);
        
        const services: Array<{ name: string; status: 'active' | 'inactive' | 'failed'; port?: number }> = [];
        
        for (const line of dataLines.slice(0, 30)) {
            if (!line.trim() || line.includes('===')) continue;
            
            const parts = line.split(/\s+/);
            if (parts.length >= 4) {
                const name = parts[0];
                const status = (parts[3] || 'unknown') as 'active' | 'inactive' | 'failed';
                
                if (name && name !== 'UNIT' && !name.includes('●')) {
                    services.push({ name, status });
                }
            }
        }
        
        return services;
    } catch {
        return [];
    }
}

/**
 * FULL MODE: Get listening ports and services
 */
async function getListeningPorts(state: AppState): Promise<Array<{ port: number; protocol: string; service: string }>> {
    try {
        // Try ss first (faster), fallback to netstat
        let output = '';
        try {
            output = await run_command(state, { cmd: ['ss', '-tln'] });
        } catch {
            output = await run_command(state, { cmd: ['netstat', '-tln'] });
        }
        
        const ports: Array<{ port: number; protocol: string; service: string }> = [];
        const lines = output.split('\n').slice(1);
        
        for (const line of lines.slice(0, 15)) {
            const match = line.match(/LISTEN\s+.*:(\d+)/);
            if (match && match[1]) {
                const port = parseInt(match[1]);
                ports.push({ port, protocol: 'TCP', service: 'unknown' });
            }
        }
        return ports;
    } catch {
        return [];
    }
}

/**
 * FULL MODE: Get firewall status
 */
async function getFirewallStatus(state: AppState): Promise<{ status: string; enabled: boolean }> {
    try {
        // Try ufw first
        try {
            const output = await run_command(state, { cmd: ['sudo', 'ufw', 'status'] });
            const enabled = output.toLowerCase().includes('active');
            return { status: output.split('\n')[0], enabled };
        } catch {
            // Fallback to iptables
            const output = await run_command(state, { cmd: ['sudo', 'iptables', '-L', '-n'] });
            return { status: 'iptables active', enabled: true };
        }
    } catch {
        return { status: 'unknown', enabled: false };
    }
}

/**
 * FULL MODE: Get SSH config info
 */
async function getSshConfigInfo(state: AppState): Promise<{ port: number; root_login: boolean }> {
    try {
        const output = await run_command(state, { cmd: ['grep', '-E', 'Port|PermitRootLogin', '/etc/ssh/sshd_config'] });
        const portMatch = output.match(/Port\s+(\d+)/);
        const rootMatch = output.match(/PermitRootLogin\s+(yes|no)/i);
        
        return {
            port: portMatch ? parseInt(portMatch[1]) : 22,
            root_login: rootMatch ? rootMatch[1].toLowerCase() === 'yes' : false
        };
    } catch {
        return { port: 22, root_login: false };
    }
}

/**
 * FULL MODE: Get performance metrics (live)
 */
async function getPerformanceMetrics(state: AppState): Promise<any> {
    try {
        // CPU usage
        let cpu_usage = 0;
        try {
            const top_output = await run_command(state, { cmd: ['top', '-bn1'] });
            const match = top_output.match(/Cpu\(s\):\s*(\d+\.\d+)%/);
            cpu_usage = match ? parseFloat(match[1]) : 0;
        } catch {}

        // Memory usage
        let memory_usage = 0, memory_used = 0, memory_available = 0;
        try {
            const free_output = await run_command(state, { cmd: ['free', '-h'] });
            const memLine = free_output.split('\n').find(l => l.includes('Mem:'));
            if (memLine) {
                const parts = memLine.split(/\s+/);
                memory_used = parseInt(parts[2]) || 0;
                memory_available = parseInt(parts[6]) || 0;
                const total = parseInt(parts[1]) || 1;
                memory_usage = Math.round((memory_used / total) * 100);
            }
        } catch {}

        // Load average
        let load_one = 0, load_five = 0, load_fifteen = 0;
        try {
            const uptime_output = await run_command(state, { cmd: ['uptime'] });
            const match = uptime_output.match(/load average:\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
            if (match) {
                load_one = parseFloat(match[1]);
                load_five = parseFloat(match[2]);
                load_fifteen = parseFloat(match[3]);
            }
        } catch {}

        // Uptime
        let uptime_seconds = 0;
        try {
            const uptime_output = await run_command(state, { cmd: ['uptime'] });
            // Extract uptime from "up X days, Y:Z" or similar
            const match = uptime_output.match(/up\s+(?:(\d+)\s+days?,\s+)?(\d+):(\d+)/);
            if (match) {
                const days = parseInt(match[1] || '0');
                const hours = parseInt(match[2]);
                const minutes = parseInt(match[3]);
                uptime_seconds = (days * 86400) + (hours * 3600) + (minutes * 60);
            }
        } catch {}

        // Process count
        let process_count = 0;
        try {
            const ps_output = await run_command(state, { cmd: ['ps', 'aux'] });
            process_count = ps_output.split('\n').length - 1;
        } catch {}

        return {
            cpu_usage_percent: cpu_usage,
            memory_usage_percent: memory_usage,
            memory_used_gb: memory_used,
            memory_available_gb: memory_available,
            load_average: { one: load_one, five: load_five, fifteen: load_fifteen },
            uptime_seconds: uptime_seconds,
            process_count: process_count,
            process_count_by_user: {}
        };
    } catch {
        return null;
    }
}

/**
 * FULL MODE: Get failed services
 */
async function getFailedServices(state: AppState): Promise<string[]> {
    try {
        const output = await run_command(state, { cmd: ['systemctl', 'list-units', '--failed'] });
        const lines = output.split('\n').slice(1);
        
        const failed: string[] = [];
        for (const line of lines) {
            if (!line.trim() || line.includes('===')) continue;
            
            const parts = line.split(/\s+/);
            if (parts[0] && parts[0] !== 'UNIT' && parts[0] !== '0') {
                failed.push(parts[0]);
            }
        }
        
        return failed.slice(0, 10);
    } catch {
        return [];
    }
}

/**
 * FULL MODE: Get recent login failures
 */
async function getRecentFailedLogins(state: AppState): Promise<number> {
    try {
        const output = await run_command(state, { cmd: ['sh', '-c', 'grep -c "Failed password" /var/log/auth.log 2>/dev/null || echo 0'] });
        return parseInt(output.trim()) || 0;
    } catch {
        return 0;
    }
}

/**
 * Show server profile
 */
export function showProfile(hostname: string = os.hostname(), configPath?: string): string {
    const profile = loadServerProfile(hostname, configPath);
    if (!profile) {
        return `No profile found for ${hostname}. Run /profile collect first.`;
    }
    return JSON.stringify(profile, null, 2);
}
