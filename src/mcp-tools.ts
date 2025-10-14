import { AppState } from './config';
import axios from 'axios';
import * as subprocess from 'child_process';

export function getMcpToolDefinitions() {
    return [
        {
            type: "function",
            function: {
                name: "mcp_tool",
                description: "Executes a query against a specified MCP server. Use this to access various MCP functionalities like search, data fetching, etc.",
                parameters: {
                    type: "object",
                    properties: {
                        server_name: { 
                            type: "string", 
                            description: "The name of the MCP server to query.",
                            enum: ['fetch', 'context7', 'ddg-search', 'deepwiki']
                        },
                        query: { 
                            type: "string", 
                            description: "The query or prompt to send to the MCP server."
                        },
                    },
                    required: ["server_name", "query"],
                },
            },
        },
    ];
}

async function execute_remote_mcp(url: string, query: string): Promise<string> {
    try {
        const response = await axios.post(url, { query });
        return response.data;
    } catch (error: any) {
        return `Error calling remote MCP tool at ${url}: ${error.message}`;
    }
}

async function execute_local_mcp(command: string, args: string[], query: string): Promise<string> {
    return new Promise((resolve) => {
        const full_args = [...args, query];
        const child = subprocess.spawn(command, full_args, { shell: false, stdio: ['ignore', 'pipe', 'pipe'] });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });

        child.on('close', (code) => {
            if (code !== 0) {
                resolve(`Local MCP tool exited with code ${code}. Stderr: ${stderr.trim()}`);
            } else {
                resolve(stdout);
            }
        });

        child.on('error', (err) => {
            resolve(`Error executing local MCP tool: ${err.message}`);
        });
    });
}

export async function mcp_tool(state: AppState, args: { server_name: string, query: string }): Promise<string> {
    const { server_name, query } = args;
    const server_config = state.mcp_servers?.mcpServers?.[server_name];

    if (!server_config) {
        return `Error: MCP server '${server_name}' not found in configuration.`;
    }

    if (server_config.url) {
        return execute_remote_mcp(server_config.url, query);
    }

    if (server_config.command) {
        return execute_local_mcp(server_config.command, server_config.args || [], query);
    }

    return `Error: Invalid configuration for MCP server '${server_name}'.`;
}

export const available_mcp_tools: { [key: string]: (state: AppState, args: any) => Promise<string> } = {
    mcp_tool,
};
