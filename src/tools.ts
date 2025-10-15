import { AppState } from './config';
import * as subprocess from 'child_process';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { ClientChannel, SFTPWrapper } from 'ssh2';
import { getMcpToolDefinitions, available_mcp_tools } from './mcp-tools';

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

export function getToolDefinitions() {
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
    ];

    const mcp_tools = getMcpToolDefinitions();
    return [...core_tools, ...mcp_tools];
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
                            resolve(output);
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
                        resolve(stdout);
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
                        }
                        else {
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


const core_tools: { [key: string]: (state: AppState, args: any) => Promise<string> } = {
    run_command,
    write_file,
    read_file,
    get_disk_usage,
    get_running_processes,
};

export const available_tools: { [key:string]: (state: AppState, args: any) => Promise<string> } = {
    ...core_tools,
    ...available_mcp_tools,
};