#!/usr/bin/env node
import input from '@inquirer/input';
import editor from '@inquirer/editor';
import confirm from '@inquirer/confirm';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import { AppState, loadInitialState } from './config';
import { handleSlashCommand } from './commands';
import { callLlmApi } from './llm';
import { available_tools } from './tools';
import { discoverMcpTools } from './mcp-tools';
import { notifyOnUpdate } from './update';
const pkg = require('../package.json');

import ora from 'ora';
import { ensureMarkdownRenderer, renderForTerminal } from './terminal-render';
import { ensureTerminalCleanState } from './terminal-utils';

// Render Markdown nicely in the terminal (fallback to plain text if deps missing)
export { renderForTerminal };

// Helper function for the 'multiline' input mode
function getMultilineInput(): Promise<string | null> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        const lines: string[] = [];
        console.log(chalk.dim('(Submit with a blank line. Press Ctrl+C to cancel)'));
        process.stdout.write(chalk.dim('... '));

        const cleanup = () => {
            rl.removeListener('line', onLine);
            rl.removeListener('SIGINT', onSigInt);
            rl.close();
        };

        const onLine = (line: string) => {
            if (line.trim() === '') {
                cleanup();
                resolve(lines.join('\n'));
            } else {
                lines.push(line);
                process.stdout.write(chalk.dim('... '));
            }
        };

        const onSigInt = () => {
            cleanup();
            resolve(null); // Resolve with null to indicate cancellation
        };

        rl.on('line', onLine);
        rl.on('SIGINT', onSigInt);
    });
}


async function checkContextUpdate(state: AppState) {
    const globalContextPath = path.join(os.homedir(), '.banjin', 'context.md');
    if (state.configPath !== path.dirname(globalContextPath)) {
        return;
    }

    const templateContextPath = path.join(__dirname, '..', 'context.md');

    if (!fs.existsSync(globalContextPath) || !fs.existsSync(templateContextPath)) {
        return;
    }

    const userContext = fs.readFileSync(globalContextPath, 'utf8');
    const templateContext = fs.readFileSync(templateContextPath, 'utf8');

    if (userContext !== templateContext) {
        const confirmation = await confirm({
            message: 'Your global context.md differs from the latest template. Would you like to overwrite it? (Your local changes will be lost)',
            default: false,
        });

        if (confirmation) {
            try {
                fs.copyFileSync(templateContextPath, globalContextPath);
                console.log(chalk.green('Global context.md has been updated. Please restart the application to see the changes.'));
                process.exit(0);
            } catch (error: any) {
                console.log(chalk.red(`Could not update context.md: ${error.message}`));
            }
        }
    }
}

function displayUsageSummary(state: AppState) {
    const contextFilesCount = state.loadedContextFiles.length;
    const mcpServersCount = state.mcp_servers?.mcpServers ? Object.keys(state.mcp_servers.mcpServers).length : 0;
    const dynamicToolsCount = state.dynamic_tool_defs.length;

    if (contextFilesCount > 0 || mcpServersCount > 0) {
        console.log(chalk.dim('Using:'));
        if (contextFilesCount > 0) {
            console.log(chalk.dim(`  - ${contextFilesCount} context.md file(s)`));
        }
        if (mcpServersCount > 0) {
            console.log(chalk.dim(`  - ${mcpServersCount} MCP server(s) configured, discovered ${dynamicToolsCount} total tool(s).`));
            if (state.mcp_successful_servers.length > 0) {
                console.log(chalk.dim.green(`    - Successfully loaded from: ${state.mcp_successful_servers.join(', ')}`));
            }
        }
    }
}

async function mainLoop() {
    notifyOnUpdate();

    const state: AppState | null = await loadInitialState();
    if (!state) return;

    // Prepare Markdown renderer if user prefers markdown
    if (state.session_config?.cli?.output_format === 'markdown') {
        await ensureMarkdownRenderer();
    }

    await checkContextUpdate(state);

    console.log(chalk.green.bold(`Banjin AI Assistant [TS Version v${pkg.version}]. Use /help for commands.`));
    console.log(chalk.dim(`Context loaded from: ${state.configPath}`));

    const discoverySpinner = ora('Discovering MCP tools...').start();
    const discovered = await discoverMcpTools(state.mcp_servers);
    state.dynamic_tool_defs = discovered.definitions;
    state.dynamic_tool_impls = discovered.implementations;
    state.mcp_successful_servers = discovered.successfulServers;
    discoverySpinner.stop();
    
    displayUsageSummary(state);

    while (true) {
        try {
            // --- Main Input Logic --- //
            let final_input: string | null = null;

            if (state.is_confirming) {
                const confirmation = await confirm({ message: chalk.yellow.bold('Approve? (y/n)> ') });
                final_input = confirmation ? 'y' : 'n';
            } else {
                const promptPrefix = state.ssh.host_string
                    ? chalk.cyan.bold(`[${state.ssh.host_string}]> `)
                    : chalk.bold('> ');
                
                const firstLine = await input({ message: promptPrefix });

                if (firstLine.startsWith('/') || firstLine.startsWith('.')) {
                    const command = firstLine.startsWith('/') ? firstLine : '/' + firstLine.slice(1).trim();
                    const shouldExit = await handleSlashCommand(state, command);
                    if (shouldExit) {
                        console.log(chalk.yellow('\nGoodbye!'));
                        break;
                    }
                    continue;
                } else if (firstLine) {
                    const inputMode = state.session_config.cli?.input_mode || 'line';
                    if (inputMode === 'editor') {
                        try {
                            const edited = await editor({ message: 'Opening editor... (save and close to submit)', default: firstLine });
                            // If user closed editor without saving (content unchanged) or content is empty, treat as cancel
                            if (typeof edited !== 'string') {
                                console.log(chalk.yellow('\nCancelled.'));
                                continue;
                            }
                            const trimmed = edited.trim();
                            if (edited === firstLine || trimmed.length === 0) {
                                console.log(chalk.yellow('\nCancelled (editor closed without changes).'));
                                continue;
                            }
                            final_input = edited;
                        } catch (e) {
                            console.log(chalk.yellow('\nCancelled.'));
                            continue;
                        }
                    } else if (inputMode === 'multiline') {
                        const restOfInput = await getMultilineInput();
                        if (restOfInput === null) {
                            console.log(chalk.yellow('\nCancelled.'));
                            continue;
                        }
                        final_input = [firstLine, restOfInput].join('\n').trim();
                    } else {
                        final_input = firstLine;
                    }
                }
            }

            if (final_input === null) continue;

            // --- End of Input Logic --- //

            if (state.is_confirming) {
                state.is_confirming = false;
                const tool_call = state.pending_tool_call;
                state.pending_tool_call = null;
                
                if (!tool_call || !tool_call.function) {
                    console.log(chalk.red('Error: Invalid tool call object.'));
                    continue;
                }
                
                if (final_input.toLowerCase() === 'y') {
                    console.log(chalk.dim('User approved. Executing tool...'));
                    const function_name = tool_call.function.name;
                    const function_args = JSON.parse(tool_call.function.arguments);
                    
                    let function_to_call = available_tools[function_name];
                    if (!function_to_call) {
                        function_to_call = state.dynamic_tool_impls[function_name];
                    }
                    
                    if (function_to_call) {
                        const spinner = ora({ text: `Executing tool: ${function_name}...`, spinner: 'dots' });
                        spinner.info(chalk.dim('(press ESC to cancel)'));
                        spinner.start();

                        let toolKeypressListener: ((str: string, key: any) => void) | undefined;
                        const cleanupToolListener = () => {
                            if (toolKeypressListener) {
                                process.stdin.removeListener('keypress', toolKeypressListener);
                                toolKeypressListener = undefined;
                            }
                            ensureTerminalCleanState();
                        };

                        let tool_response: string;
                        try {
                            const cancelToolPromise = new Promise<string>(resolve => {
                                readline.emitKeypressEvents(process.stdin);
                                if (process.stdin.isTTY) {
                                    process.stdin.setRawMode(true);
                                }
                                toolKeypressListener = (str, key) => {
                                    if (key.name === 'escape') {
                                        resolve('__CANCELLED_BY_USER__');
                                    }
                                };
                                process.stdin.on('keypress', toolKeypressListener);
                            });

                            const toolCall = function_to_call(state, function_args);
                            
                            // Add timeout if configured (0 = no timeout)
                            const timeoutMs = (state.session_config?.cli?.tool_timeout ?? 300) * 1000;
                            const promises: Promise<string>[] = [toolCall, cancelToolPromise];
                            
                            if (timeoutMs > 0) {
                                const timeoutPromise = new Promise<string>(resolve => {
                                    setTimeout(() => resolve('__TIMEOUT__'), timeoutMs);
                                });
                                promises.push(timeoutPromise);
                            }

                            const result = await Promise.race(promises);

                            cleanupToolListener();

                            if (result === '__CANCELLED_BY_USER__') {
                                spinner.fail('Tool execution cancelled by user.');
                                tool_response = 'Tool execution was cancelled by the user.';
                                // Small delay to allow terminal to settle
                                await new Promise(resolve => setTimeout(resolve, 50));
                            } else if (result === '__TIMEOUT__') {
                                spinner.fail(`Tool execution timed out after ${timeoutMs / 1000}s.`);
                                tool_response = `Tool execution timed out after ${timeoutMs / 1000} seconds. Consider increasing cli.tool_timeout in config or set to 0 to disable.`;
                            } else {
                                spinner.succeed();
                                tool_response = result as string;
                            }
                        } catch (error: any) {
                            cleanupToolListener();
                            spinner.fail('Tool execution failed.');
                            tool_response = `Error: ${error.message}`;
                        }
                    
                        state.conversation.push({
                            role: 'tool',
                            tool_call_id: tool_call.id,
                            name: function_name,
                            content: tool_response,
                        });
                    
                        const llmSpinner = ora('Waiting for LLM... (press ESC to cancel)').start();
                        const post_tool_llm_response = await callLlmApi(state);
                        llmSpinner.stop();
                    
                        if (post_tool_llm_response) {
                            if (post_tool_llm_response.tool_calls && post_tool_llm_response.tool_calls.length > 0) {
                                const next_tool_call = post_tool_llm_response.tool_calls[0];
                                state.is_confirming = true;
                                state.pending_tool_call = next_tool_call;
                                const tool_name = next_tool_call.function.name;
                                const tool_args = next_tool_call.function.arguments;
                        
                                console.log(chalk.yellow('LLM wants to run tool:'));
                                console.log(chalk.bold.cyan(tool_name));
                                console.log(chalk.dim(tool_args));
                            } else if (post_tool_llm_response.content) {
                                const rendered = renderForTerminal(state, post_tool_llm_response.content);
                                console.log(chalk.green('Banjin:') + '\n' + rendered);
                            }
                        }
                    } else {
                        console.log(chalk.red(`Error: Tool ${function_name} not found.`));
                    }
                } else {
                    console.log(chalk.dim('User denied. Aborting.'));
                    state.conversation.push({
                        role: 'tool',
                        tool_call_id: tool_call.id,
                        name: tool_call.function.name,
                        content: 'User denied execution.',
                    });
                    const denial_response = await callLlmApi(state);
                    if (denial_response && denial_response.content) {
                        const rendered = renderForTerminal(state, denial_response.content);
                        console.log(chalk.green('Banjin:') + '\n' + rendered);
                    }
                }
            } else if (final_input) { // This block now only handles sending the final input to the LLM
                state.conversation.push({ role: 'user', content: final_input });
                
                const spinner = ora({ text: 'Waiting for LLM...', spinner: 'dots' });
                spinner.info(chalk.dim('(press ESC to cancel)'));
                spinner.start();

                let keypressListener: ((str: string, key: any) => void) | undefined;
                const cleanupListener = () => {
                    if (keypressListener) {
                        process.stdin.removeListener('keypress', keypressListener);
                        keypressListener = undefined;
                    }
                    ensureTerminalCleanState();
                };

                try {
                    const cancelPromise = new Promise(resolve => {
                        readline.emitKeypressEvents(process.stdin);
                        if (process.stdin.isTTY) {
                            process.stdin.setRawMode(true);
                        }
                        keypressListener = (str, key) => {
                            if (key.name === 'escape') {
                                resolve('cancelled');
                            }
                        };
                        process.stdin.on('keypress', keypressListener);
                    });

                    const llmCall = callLlmApi(state, (status) => {
                        spinner.text = chalk.yellow(status);
                    });

                    const response_message = await Promise.race([llmCall, cancelPromise]);

                    cleanupListener();

                    if (response_message === 'cancelled') {
                        spinner.fail('Cancelled by user.');
                        state.conversation.pop();
                        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to allow TTY to settle
                        continue;
                    }
                    
                    spinner.succeed('LLM response received.');

                    if (response_message) {
                        if (response_message.tool_calls && response_message.tool_calls.length > 0) {
                            const tool_call = response_message.tool_calls[0];
                            state.is_confirming = true;
                            state.pending_tool_call = tool_call;
                            const tool_name = tool_call.function.name;
                            const tool_args = tool_call.function.arguments;
                            
                            console.log(chalk.yellow('LLM wants to run tool:'));
                            console.log(chalk.bold.cyan(tool_name));
                            console.log(chalk.dim(tool_args));

                        } else if (response_message.content) {
                            const rendered = renderForTerminal(state, response_message.content);
                            console.log(chalk.green('Banjin:') + '\n' + rendered);
                        }
                    }
                } catch (e) {
                    cleanupListener();
                    spinner.fail('An error occurred.');
                    console.error(e);
                }
            }
        } catch (error: any) {
            if (error.message.includes('User force closed')) {
                console.log(chalk.yellow('\nGoodbye!'));
            } else {
                console.log(chalk.red(`\nAn unexpected error occurred: ${error.message}`));
            }
            break;
        }
    }
    
    // Cleanup and exit
    ensureTerminalCleanState();
}

mainLoop().then(() => {
    process.exit(0);
}).catch((err) => {
    console.error(chalk.red('Fatal error:'), err);
    ensureTerminalCleanState();
    process.exit(1);
});
