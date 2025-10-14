import { AppState } from './config';
import * as subprocess from 'child_process';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { ClientChannel, SFTPWrapper } from 'ssh2';
import { getMcpToolDefinitions, available_mcp_tools } from './mcp-tools';

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
                const escapedCmd = cmd.map(arg => `'${arg.replace(/'/g, "'\\''")}'`).join(' ');
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

const core_tools: { [key: string]: (state: AppState, args: any) => Promise<string> } = {
    run_command,
    write_file,
    read_file,
};

export const available_tools: { [key: string]: (state: AppState, args: any) => Promise<string> } = {
    ...core_tools,
    ...available_mcp_tools,
};
