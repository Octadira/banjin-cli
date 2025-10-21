import { AppState } from './config';
import * as subprocess from 'child_process';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { ClientChannel, SFTPWrapper } from 'ssh2';
import confirm from '@inquirer/confirm';

// Maximum output size to prevent API payload errors (in characters)
const MAX_OUTPUT_SIZE = 50000; // ~50KB of text

/**
 * Intelligently handles large output from commands.
 * For commands that produce massive output, returns a helpful message
 * instead of truncating blindly.
 */
function handleLargeOutput(output: string, command: string[], maxSize: number = MAX_OUTPUT_SIZE): string {
    if (output.length <= maxSize) {
        return output;
    }
    
    const lines = output.split('\n');
    const sizeInKB = Math.round(output.length / 1024);
    
    // Detect common problematic commands
    const cmdStr = command.join(' ');
    const isRecursiveFind = cmdStr.includes('find /') || cmdStr.includes('find .');
    const isRecursiveGrep = cmdStr.match(/grep.*-[rR]/);
    
    if (isRecursiveFind || isRecursiveGrep) {
        return `Command output is too large (${sizeInKB}KB, ${lines.length} lines).
        
This type of recursive search produces massive output that cannot be processed.

SUGGESTIONS:
- For file search: Use more specific paths (e.g., 'find /var/log' instead of 'find /')
- Add filters: Use -name, -type, -maxdepth to limit results
- For grep: Specify exact directories and use -l to list filenames only
- Limit output: Add '| head -n 100' to see first 100 lines

Example better commands:
- find /home/user -name "*.log" -maxdepth 3
- grep -r "pattern" /var/log --include="*.log" | head -n 50
- find /etc -name "*.conf" -type f

First 50 lines of output:
${lines.slice(0, 50).join('\n')}`;
    }
    
    // For other large outputs, show beginning and end with truncation notice
    const previewLines = 100;
    const halfPreview = Math.floor(previewLines / 2);
    
    return `Command output is large (${sizeInKB}KB, ${lines.length} lines). Showing first and last ${halfPreview} lines:

=== FIRST ${halfPreview} LINES ===
${lines.slice(0, halfPreview).join('\n')}

... [${lines.length - previewLines} lines omitted] ...

=== LAST ${halfPreview} LINES ===
${lines.slice(-halfPreview).join('\n')}

TIP: Consider using grep, head, tail, or other filters to reduce output size.`;
}

// Interface for the structured output of get_disk_usage
interface DfOutput {
    filesystem: string;
    size: string;
    used: string;
    available: string;
    use_percent: string;
    mounted_on: string;
}

// Interface for the structured output of get_running_processes
interface ProcessInfo {
    user: string;
    pid: string;
    cpu_percent: string;
    mem_percent: string;
    vsz: string;
    rss: string;
    tty: string;
    stat: string;
    start: string;
    time: string;
    command: string;
}

// Interface for the structured output of get_service_status
interface ServiceStatusInfo {
    service: string;
    description?: string;
    is_loaded: boolean;
    is_enabled?: boolean;
    status: 'active' | 'inactive' | 'failed' | 'unknown';
    status_details?: string;
    main_pid?: string;
}

export function getToolDefinitions(state: AppState) {
    const core_tools = [
        {
            type: "function",
            function: {
                name: "run_command",
                description: "Executes a shell command. The 'cmd' parameter should be an array where the first element is the command and subsequent elements are its literal arguments. Do NOT include shell metacharacters like pipes (|) or redirects (>) directly in the 'cmd' array. If shell features are required (e.g., piping commands), use 'sh -c' as the command, and pass the full shell command string as a single argument (e.g., {\"cmd\":[\"sh\", \"-c\", \"ps aux | grep chainlit\"]}). If connected via SSH, runs on the remote server, otherwise runs locally.",
                parameters: {
                    type: "object",
                    properties: {
                        cmd: { type: "array", items: { type: "string" }, description: "The command and its arguments as an array of strings." },
                    },
                    required: ["cmd"],
                },
            },
        },
        {
            type: "function",
            function: {
                name: "write_file",
                description: "Writes content to a file. The 'file_path' parameter should be the exact name of the file, including its extension (e.g., 'my_document.txt'). If connected via SSH, writes to the remote server, otherwise writes locally. Returns a success message upon completion.",
                parameters: {
                    type: "object",
                    properties: {
                        file_path: { type: "string", description: "The relative or absolute path to the file." },
                        content: { type: "string", description: "The content to write." },
                    },
                    required: ["file_path", "content"],
                },
            },
        },
        {
            type: "function",
            function: {
                name: "read_file",
                description: "Reads content from a file. The 'file_path' parameter should be the exact name of the file, including its extension (e.g., 'my_document.txt'). Returns the file's content as a string. If the file does not exist or cannot be read, it returns an error message starting with 'Error:'. If connected via SSH, reads from the remote server, otherwise reads locally.",
                parameters: {
                    type: "object",
                    properties: {
                        file_path: { type: "string", description: "The relative path to the file." },
                    },
                    required: ["file_path"],
                },
            },
        },
        {
            type: "function",
            function: {
                name: "get_disk_usage",
                description: "Retrieves disk usage statistics for all mounted filesystems. Returns a JSON array where each object represents a filesystem and its usage details.",
                parameters: {
                    type: "object",
                    properties: {},
                    required: [],
                },
            },
        },
        {
            type: "function",
            function: {
                name: "get_running_processes",
                description: "Retrieves a list of currently running processes. Can be filtered by a search string. Returns a JSON array of process objects.",
                parameters: {
                    type: "object",
                    properties: {
                        filter: {
                            type: "string",
                            description: "Optional. A string to filter the process list by. Only processes matching the string will be returned."
                        }
                    },
                },
            },
        },
        {
            type: "function",
            function: {
                name: "get_service_status",
                description: "Retrieves the status of a systemd service (e.g., 'nginx', 'docker'). Returns a JSON object with details about the service's state.",
                parameters: {
                    type: "object",
                    properties: {
                        service_name: {
                            type: "string",
                            description: "The name of the systemd service to inspect."
                        }
                    },
                    required: ["service_name"],
                },
            },
        },
        {
            type: "function",
            function: {
                name: "save_profile_notes",
                description: "ONLY use this if user explicitly said 'save' or 'record'. Directly saves notes without asking. For normal observations, use suggest_profile_update instead.",
                parameters: {
                    type: "object",
                    properties: {
                        hostname: {
                            type: "string",
                            description: "Optional. The server alias or hostname/IP. If omitted, uses current SSH connection."
                        },
                        note: {
                            type: "string",
                            description: "Optional. An observation to save (e.g., 'Security patches applied successfully')"
                        },
                        tags: {
                            type: "array",
                            items: { type: "string" },
                            description: "Optional. Tags to save (e.g., ['updated', 'hardened'])"
                        }
                    }
                }
            }
        },
        {
            type: "function",
            function: {
                name: "suggest_profile_update",
                description: "DEFAULT tool for recording observations. Suggests notes or tags with user confirmation popup (yes/no). Use for ANY observation, finding, or issue you detect on the server. User sees popup and decides whether to save.",
                parameters: {
                    type: "object",
                    properties: {
                        hostname: {
                            type: "string",
                            description: "Optional. The server alias or hostname/IP. If omitted, uses current SSH connection."
                        },
                        note: {
                            type: "string",
                            description: "Plain language observation (e.g., 'Database requires urgent memory upgrade - currently using 92% of 64GB')"
                        },
                        tags: {
                            type: "array",
                            items: { type: "string" },
                            description: "Issue categories (e.g., ['performance', 'critical', 'memory'])"
                        }
                    }
                }
            }
        },
        {
            type: "function",
            function: {
                name: "suggest_action_plan",
                description: "Propose an action plan for fixing a problem (Scenario 3). Shows detailed plan with risk level. Use when you identify a problem that requires step-by-step remediation. User sees popup and decides whether to approve.",
                parameters: {
                    type: "object",
                    properties: {
                        title: {
                            type: "string",
                            description: "Short title (e.g., 'Update system packages', 'Rotate SSH keys', 'Fix disk space issue')"
                        },
                        description: {
                            type: "string",
                            description: "Plain language explanation of the problem and solution in 1-2 sentences"
                        },
                        steps: {
                            type: "array",
                            items: { type: "string" },
                            description: "Numbered list of clear, step-by-step instructions that anyone can follow"
                        },
                        estimatedTime: {
                            type: "string",
                            description: "How long it will take (e.g., '5 minutes', '30 minutes', '2 hours')"
                        },
                        risk: {
                            type: "string",
                            enum: ["low", "medium", "high"],
                            description: "Risk assessment: low=safe, medium=requires attention, high=may cause downtime"
                        }
                    },
                    required: ["title", "description", "steps", "estimatedTime", "risk"]
                }
            }
        }
    ];

    return [...core_tools, ...state.dynamic_tool_defs];
}

export async function run_command(state: AppState, args: { cmd: string[] }): Promise<string> {
    const { cmd } = args;
    if (!cmd || cmd.length === 0) {
        return Promise.resolve("Error: Empty command provided.");
    }

    return new Promise((resolve) => {
        try {
            if (state.ssh.client) {
                // Remote execution (SSH)
                const escapedCmd = cmd.map(arg => `'${arg.replace(/'/g, "'\'\''")}'`).join(' ');
                let output = '';
                let errorOutput = '';
                state.ssh.client.exec(escapedCmd, (err: Error | undefined, stream: ClientChannel) => {
                    if (err) {
                        // This error is for stream creation failure
                        resolve(`Error starting remote command: ${err.message}`);
                        return;
                    }
                    stream.on('close', (code: number) => {
                        if (code !== 0) {
                            resolve(`Remote command failed with exit code ${code}. Error: ${errorOutput.trim() || 'No error output'}`);
                        } else {
                            resolve(handleLargeOutput(output, cmd));
                        }
                    }).on('data', (data: Buffer) => {
                        output += data.toString();
                    }).stderr.on('data', (data: Buffer) => {
                        errorOutput += data.toString();
                    });
                });
            } else {
                // Local execution
                const command = cmd[0];
                const sub_args = cmd.slice(1);

                const child = subprocess.spawn(command, sub_args, { shell: false });

                let stdout = '';
                let stderr = '';

                child.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                child.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                child.on('close', (code) => {
                    if (code !== 0) {
                        resolve(`Local command failed with exit code ${code}. Stderr: ${stderr.trim()}`);
                    }
                    else {
                        resolve(handleLargeOutput(stdout, cmd));
                    }
                });

                child.on('error', (err) => {
                    // e.g., command not found
                    resolve(`Error executing local command: ${err.message}`);
                });
            }
        }
        catch (error: any) {
            resolve(`Error executing command: ${error.message}`);
        }
    });
}

export async function write_file(state: AppState, args: { file_path: string, content: string }): Promise<string> {
    const { file_path, content } = args;
    try {
        if (state.ssh.client) {
            return new Promise((resolve) => {
                state.ssh.client.sftp((err: Error | undefined, sftp: SFTPWrapper) => {
                    if (err) {
                        resolve(`SFTP error: ${err.message}`);
                        return;
                    }
                    sftp.writeFile(file_path, content, (writeErr: Error | null | undefined) => {
                        if (writeErr) {
                            resolve(`Error writing remote file: ${writeErr.message}`);
                        } else {
                            resolve(`Successfully wrote to remote file: ${file_path}`);
                        }
                    });
                });
            });
        } else {
            const target_path = path.resolve(process.cwd(), file_path);
            if (!target_path.startsWith(process.cwd())) {
                return "Error: Cannot write outside the current working directory.";
            }
            await fsPromises.mkdir(path.dirname(target_path), { recursive: true });
            await fsPromises.writeFile(target_path, content);
            return `Successfully wrote content to file '${file_path}'`;
        }
    } catch (error: any) {
        return `Error writing file: ${error.message}`;
    }
}

export async function read_file(state: AppState, args: { file_path: string }): Promise<string> {
    const { file_path } = args;
    try {
        if (state.ssh.client) {
            return new Promise((resolve) => {
                state.ssh.client.sftp((err: Error | undefined, sftp: SFTPWrapper) => {
                    if (err) {
                        resolve(`SFTP error: ${err.message}`);
                        return;
                    }
                    sftp.readFile(file_path, 'utf8', (readErr: Error | null | undefined, data: string | Buffer) => {
                        if (readErr) {
                            resolve(`Error reading remote file: ${readErr.message}`);
                        } else {
                            resolve(`Content of file '${file_path}':\n${data.toString()}`);
                        }
                    });
                });
            });
        } else {
            const target_path = path.resolve(process.cwd(), file_path);
            if (!target_path.startsWith(process.cwd())) {
                return "Error: Cannot read outside the current working directory.";
            }
            const content = await fsPromises.readFile(target_path, 'utf8');
            return `Content of file '${file_path}':\n${content}`;
        }
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return `Error: File not found at ${file_path}`;
        }
        return `Error reading file: ${error.message}`;
    }
}

export async function get_disk_usage(state: AppState, args: {}): Promise<string> {
    try {
        // The -P flag ensures POSIX standard output format, which prevents line wrapping and is more stable for parsing.
        const dfOutput = await exports.run_command(state, { cmd: ['df', '-h', '-P'] });
        if (dfOutput.startsWith('Error:')) {
            return dfOutput;
        }

        const lines = dfOutput.trim().split('\n');
        const headerLine = lines.shift(); // remove header line
        if (!headerLine) {
            return "Error: 'df' command returned empty output.";
        }

        const filesystems = lines.map((line: string): DfOutput | null => {
            // Replace multiple spaces with a single space for easier splitting, then split.
            const parts = line.trim().replace(/\s+/g, ' ').split(' ');
            
            if (parts.length < 6) {
                return null; // Invalid line, skip
            }

            return {
                filesystem: parts[0],
                size: parts[1],
                used: parts[2],
                available: parts[3],
                use_percent: parts[4],
                mounted_on: parts[5],
            };
        }).filter((fs: DfOutput | null): fs is DfOutput => fs !== null);

        return JSON.stringify(filesystems, null, 2);
    } catch (error: any) {
        return `Error getting disk usage: ${error.message}`;
    }
}

export async function get_running_processes(state: AppState, args: { filter?: string }): Promise<string> {
    try {
        let command;
        if (args.filter) {
            // Using sh -c to handle the pipe. Note: This is a simplified implementation.
            // For production, the filter argument should be sanitized to prevent shell injection.
            command = ['sh', '-c', `ps aux | grep ${args.filter}`];
        } else {
            command = ['ps', 'aux'];
        }

        const psOutput = await exports.run_command(state, { cmd: command });
        if (psOutput.startsWith('Error:')) {
            return psOutput;
        }

        const lines = psOutput.trim().split('\n');
        const headerLine = lines.shift();
        if (!headerLine) {
            return "Error: 'ps' command returned empty output.";
        }

        const processes = lines.map((line: string): ProcessInfo | null => {
            const parts = line.trim().replace(/\s+/g, ' ').split(' ');
            
            if (parts.length < 11) {
                return null; // Not a valid process line
            }

            const command = parts.slice(10).join(' ');

            return {
                user: parts[0],
                pid: parts[1],
                cpu_percent: parts[2],
                mem_percent: parts[3],
                vsz: parts[4],
                rss: parts[5],
                tty: parts[6],
                stat: parts[7],
                start: parts[8],
                time: parts[9],
                command: command,
            };
        }).filter((p: ProcessInfo | null): p is ProcessInfo => p !== null);

        // If a filter was used, we might get the grep process itself in the list, so we filter it out.
        const final_processes = args.filter 
            ? processes.filter((p: ProcessInfo) => !p.command.includes(`grep ${args.filter}`))
            : processes;

        return JSON.stringify(final_processes, null, 2);
    } catch (error: any) {
        return `Error getting process list: ${error.message}`;
    }
}

export async function get_service_status(state: AppState, args: { service_name: string }): Promise<string> {
    if (!args.service_name) {
        return "Error: service_name parameter is required.";
    }
    try {
        // We add `|| true` to the shell command to prevent it from returning a non-zero exit code if the service is not found,
        // allowing us to parse the "Unit could not be found" message.
        const command = ['sh', '-c', `systemctl status ${args.service_name} || true`];
        const statusOutput = await exports.run_command(state, { cmd: command });

        if (statusOutput.includes("command not found")) {
            return JSON.stringify({ service: args.service_name, status: 'unknown', status_details: 'systemctl command not found. This may not be a systemd-based OS.' });
        }
        if (statusOutput.includes("Unit") && statusOutput.includes("could not be found")) {
            return JSON.stringify({ service: args.service_name, status: 'unknown', status_details: `Service '${args.service_name}' not found.` });
        }

        const result: ServiceStatusInfo = {
            service: args.service_name,
            is_loaded: false,
            status: 'unknown',
        };

        const loadedMatch = statusOutput.match(/Loaded: (\w+)/);
        if (loadedMatch) {
            result.is_loaded = loadedMatch[1] === 'loaded';
        }

        const enabledMatch = statusOutput.match(/; (enabled|disabled|static);/);
        if (enabledMatch) {
            result.is_enabled = enabledMatch[1] === 'enabled';
        }

        const activeMatch = statusOutput.match(/Active: (\w+) \((.*?)\)/);
        if (activeMatch) {
            const status = activeMatch[1];
            if (status === 'active' || status === 'inactive' || status === 'failed') {
                result.status = status;
            }
            result.status_details = activeMatch[2];
        }
        
        const pidMatch = statusOutput.match(/Main PID: (\d+)/);
        if (pidMatch) {
            result.main_pid = pidMatch[1];
        }

        const descriptionMatch = statusOutput.match(/● .+? - (.*)/);
        if (descriptionMatch) {
            result.description = descriptionMatch[1].trim();
        }

        return JSON.stringify(result, null, 2);
    } catch (error: any) {
        return `Error getting service status: ${error.message}`;
    }
}

const core_tools: { [key: string]: (state: AppState, args: any) => Promise<string> } = {
    run_command,
    write_file,
    read_file,
    get_disk_usage,
    get_running_processes,
    get_service_status,
};

/**
 * Profiling and audit tools (built-in)
 */
async function get_server_profile(state: AppState, _args: any): Promise<string> {
    const { loadServerProfile, summarizeProfile } = require('./profiling');
    const profile = loadServerProfile();
    if (!profile) {
        return 'No server profile available. Run /profile collect first.';
    }
    return JSON.stringify(profile, null, 2);
}

async function log_audit_entry(state: AppState, args: any): Promise<string> {
    const { logAction } = require('./profiling');
    try {
        logAction(args.hostname || 'localhost', {
            user: args.user || 'unknown',
            host: args.hostname || 'localhost',
            action: args.action || 'unknown',
            details: args.details || '',
            status: args.status || 'unknown'
        });
        return 'Audit entry logged.';
    } catch (error: any) {
        return `Failed to log audit entry: ${error.message}`;
    }
}


/**
 * Scenario 1: Auto-save notes
 * When LLM says "save this note to profile", immediately save it
 */
async function save_profile_notes(state: AppState, args: any): Promise<string> {
    const { applyProfileSuggestion, createProfileSuggestion } = require('./profiling');
    try {
        const hostname = args.hostname || state.ssh?.ssh_alias || state.ssh?.host_string?.split('@')[1] || 'localhost';
        const note = args.note || '';
        const tags = args.tags ? (typeof args.tags === 'string' ? args.tags.split(',').map((t: string) => t.trim()) : args.tags) : [];
        
        if (!note && (!tags || tags.length === 0)) {
            return 'Error: provide at least a note or tags to save.';
        }
        
        // Create suggestion then immediately apply
        const suggestion = createProfileSuggestion(hostname, note, tags, state.configPath);
        const result = applyProfileSuggestion(suggestion);
        
        return `✅ Auto-saved to profile: ${result}`;
    } catch (error: any) {
        return `Failed to auto-save profile notes: ${error.message}`;
    }
}

/**
 * Scenario 2: Suggest profile notes (with popup)
 * LLM detects issue → shows popup (yes/no/edit) → user decides
 */
async function suggest_profile_update(state: AppState, args: any): Promise<string> {
    const { createProfileSuggestion } = require('./profiling');
    try {
        const hostname = args.hostname || state.ssh?.ssh_alias || state.ssh?.host_string?.split('@')[1] || 'localhost';
        const note = args.note || '';
        const tags = args.tags ? (typeof args.tags === 'string' ? args.tags.split(',').map((t: string) => t.trim()) : args.tags) : [];
        
        if (!note && (!tags || tags.length === 0)) {
            return 'Error: provide at least a note or tags to suggest.';
        }
        
        // Create suggestion and store in state
        const suggestion = createProfileSuggestion(hostname, note, tags, state.configPath);
        state.pendingSuggestion = suggestion;
        
        // Show popup
        console.log('\n📋 Profile Update Suggestion:');
        console.log(`   Server: ${hostname}`);
        if (suggestion.proposedNote) {
            console.log(`   💬 Note: "${suggestion.proposedNote}"`);
        }
        if (suggestion.proposedTags && suggestion.proposedTags.length > 0) {
            console.log(`   🏷️  Tags: [${suggestion.proposedTags.join(', ')}]`);
        }
        
        const approved = await confirm({
            message: 'Apply this suggestion?',
            default: true
        });
        
        if (approved) {
            const { applyProfileSuggestion } = require('./profiling');
            const result = applyProfileSuggestion(suggestion);
            state.pendingSuggestion = undefined;
            return `✅ Applied: ${result}`;
        } else {
            state.pendingSuggestion = undefined;
            return '❌ Suggestion rejected.';
        }
    } catch (error: any) {
        return `Failed to process profile suggestion: ${error.message}`;
    }
}

/**
 * Scenario 3: Suggest action plan
 * LLM detects problem → shows action plan (yes/no) → executes if approved
 */
async function suggest_action_plan(state: AppState, args: any): Promise<string> {
    try {
        const title = args.title || 'System Action';
        const description = args.description || '';
        const steps: string[] = args.steps || [];
        const estimatedTime = args.estimatedTime || 'unknown';
        const risk = args.risk || 'medium';
        
        if (!description || steps.length === 0) {
            return 'Error: provide description and at least one step.';
        }
        
        // Show action plan popup
        console.log('\n🔧 Suggested Action Plan:');
        console.log(`   Title: ${title}`);
        console.log(`   Description: ${description}`);
        console.log(`   Estimated Time: ${estimatedTime}`);
        console.log(`   Risk Level: ${risk.toUpperCase()}`);
        console.log(`\n   Steps:`);
        steps.forEach((step, idx) => {
            console.log(`   ${idx + 1}. ${step}`);
        });
        
        const approved = await confirm({
            message: `Execute this ${risk} risk plan?`,
            default: risk === 'low'
        });
        
        if (approved) {
            // Store the action plan for potential execution
            state.pendingActionPlan = {
                title,
                description,
                steps,
                estimatedTime,
                risk,
                status: 'approved'
            };
            return `✅ Action plan approved for execution:\n${title}\n${description}`;
        } else {
            return '❌ Action plan rejected.';
        }
    } catch (error: any) {
        return `Failed to process action plan: ${error.message}`;
    }
}

export const available_tools: { [key:string]: (state: AppState, args: any) => Promise<string> } = {
    ...core_tools,
    get_server_profile,
    log_audit_entry,
    save_profile_notes,
    suggest_profile_update,
    suggest_action_plan,
    // ...available_mcp_tools, // This is now handled dynamically
};
