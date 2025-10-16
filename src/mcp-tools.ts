import { AppState } from './config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import chalk from 'chalk';
import { URL } from 'url';

export interface DiscoveredMcpTools {
    definitions: any[];
    implementations: { [key: string]: (state: AppState, args: any) => Promise<string> };
    successfulServers: string[];
}

export async function discoverMcpTools(mcp_servers: any): Promise<DiscoveredMcpTools> {
    const definitions: any[] = [];
    const implementations: { [key: string]: (state: AppState, args: any) => Promise<string> } = {};
    const successfulServers: string[] = [];

    if (!mcp_servers?.mcpServers) {
        return { definitions, implementations, successfulServers };
    }

    const discoveryPromises = Object.keys(mcp_servers.mcpServers).map(async (serverName) => {
        const serverConfig = mcp_servers.mcpServers[serverName];
        const client = new Client({ name: 'banjin-client', version: '1.4.0' });
        let transport;

        if (serverConfig.url) {
            transport = new StreamableHTTPClientTransport(new URL(serverConfig.url));
        } else if (serverConfig.command) {
            const augmentedArgs = [...(serverConfig.args || []), '--json'];
            transport = new StdioClientTransport({ 
                command: serverConfig.command, 
                args: augmentedArgs,
                env: serverConfig.env || process.env
            });
        } else {
            return; // Skip if no url or command
        }

        try {
            await client.connect(transport);
            const toolsResult = await client.listTools();
            
            if (toolsResult) {
                successfulServers.push(serverName);
            }

            if (!toolsResult.tools) return;

            for (const tool of toolsResult.tools) {
                const dynamicToolName = `${serverName}_${tool.name}`.replace(/-/g, '_');

                implementations[dynamicToolName] = async (state: AppState, tool_args: any): Promise<string> => {
                    const callClient = new Client({ name: 'banjin-client', version: '1.4.0' });
                    let callTransport;
                    if (serverConfig.url) {
                        callTransport = new StreamableHTTPClientTransport(new URL(serverConfig.url));
                    } else if (serverConfig.command) {
                        const augmentedArgs = [...(serverConfig.args || []), '--json'];
                        callTransport = new StdioClientTransport({ 
                            command: serverConfig.command, 
                            args: augmentedArgs,
                            env: serverConfig.env || process.env
                        });
                    } else {
                        return `Error: Invalid configuration for MCP server '${serverName}'.`;
                    }

                    try {
                        await callClient.connect(callTransport);
                        const result = await callClient.callTool({ name: tool.name, arguments: tool_args });
                        const content = result.content as any;
                        return typeof content === 'string' ? content : JSON.stringify(content, null, 2);
                    } catch (e: any) {
                        if (e && typeof e === 'object' && 'isAxiosError' in e) {
                            const axiosError = e as any;
                            return `Error during MCP tool execution: Request failed with status ${axiosError.response?.status}. Message: ${axiosError.message}`;
                        }
                        return `Error calling MCP tool ${dynamicToolName}: ${e.message}`;
                    } finally {
                        await callClient.close();
                    }
                };

                definitions.push({
                    type: "function",
                    function: {
                        name: dynamicToolName,
                        description: tool.description,
                        parameters: tool.inputSchema,
                    },
                });
            }
        } catch (e: any) {
            if (!e.message.includes('Process was closed')) {
                console.warn(chalk.yellow(`  - MCP Warning: Could not discover tools for '${serverName}'. ${e.message}`));
            }
        } finally {
            await client.close();
        }
    });

    await Promise.all(discoveryPromises);

    return { definitions, implementations, successfulServers };
}