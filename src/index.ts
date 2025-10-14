#!/usr/bin/env node
import inquirer from 'inquirer';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { AppState, loadInitialState } from './config';
import { handleSlashCommand } from './commands';
import { callLlmApi } from './llm';
import { available_tools } from './tools';
import updateNotifier from 'update-notifier';
const pkg = require('../package.json');



import ora from 'ora';

async function checkContextUpdate(configPath: string) {
    const userContextPath = path.join(configPath, 'context.md');
    const templateContextPath = path.join(__dirname, '..', 'context.md');

    if (!fs.existsSync(userContextPath) || !fs.existsSync(templateContextPath)) {
        return;
    }

    const userContext = fs.readFileSync(userContextPath, 'utf8');
    const templateContext = fs.readFileSync(templateContextPath, 'utf8');

    if (userContext !== templateContext) {
        const answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'updateContext',
                message: 'Your global context.md differs from the latest template. Would you like to overwrite it? (Your local changes will be lost)',
                default: false,
            },
        ]);

        if (answers.updateContext) {
            try {
                fs.copyFileSync(templateContextPath, userContextPath);
                console.log(chalk.green('Global context.md has been updated.'));
            } catch (error: any) {
                console.log(chalk.red(`Could not update context.md: ${error.message}`));
            }
        }
    }
}

function displayUsageSummary(state: AppState) {
    const contextFilesCount = state.loadedContextFiles.length;
    const mcpServersCount = state.mcp_servers?.mcpServers ? Object.keys(state.mcp_servers.mcpServers).length : 0;

    if (contextFilesCount > 0 || mcpServersCount > 0) {
        console.log(chalk.dim('Using:'));
        if (contextFilesCount > 0) {
            console.log(chalk.dim(`  - ${contextFilesCount} context.md file(s)`));
        }
        if (mcpServersCount > 0) {
            console.log(chalk.dim(`  - ${mcpServersCount} MCP server(s)`));
        }
    }
}

async function mainLoop() {
    updateNotifier({ pkg }).notify();

    const state: AppState | null = await loadInitialState();
    if (!state) return;

    await checkContextUpdate(state.configPath);

    console.log(chalk.green.bold(`Banjin AI Assistant [TS Version v${pkg.version}]. Use /help for commands.`));
    console.log(chalk.dim(`Context loaded from: ${state.configPath}`));
    
    displayUsageSummary(state);

    while (true) {
        try {
            const promptPrefix = state.ssh.host_string
                ? chalk.cyan.bold(`[${state.ssh.host_string}]> `)
                : chalk.bold('> ');
            
            const confirmPrefix = chalk.yellow.bold('Approve? (y/n)> ');

            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'prompt',
                    message: state.is_confirming ? confirmPrefix : promptPrefix,
                },
            ]);

            const input = answers.prompt.trim();

            if (state.is_confirming) {
                state.is_confirming = false;
                const tool_call = state.pending_tool_call;
                state.pending_tool_call = null;
                
                if (!tool_call || !tool_call.function) {
                    console.log(chalk.red('Error: Invalid tool call object.'));
                    continue;
                }
                
                if (input.toLowerCase() === 'y' || input.toLowerCase() === 'yes') {
                    console.log(chalk.dim('User approved. Executing tool...'));
                    const function_name = tool_call.function.name;
                    const function_args = JSON.parse(tool_call.function.arguments);
                                        const function_to_call = available_tools[function_name];
                    
                                        if (function_to_call) {
                                            const spinner = ora(`Executing tool: ${function_name}...`).start();
                                            const tool_response = await function_to_call(state, function_args);
                                            spinner.succeed();
                    
                                            state.conversation.push({
                                                role: 'tool',
                                                tool_call_id: tool_call.id,
                                                name: function_name,
                                                content: tool_response,
                                            });
                    
                                            const llmSpinner = ora('Waiting for LLM...').start();
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
                                console.log(chalk.green('Banjin: ') + post_tool_llm_response.content);
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
                    // Inform LLM of denial and get a new response
                    const denial_response = await callLlmApi(state);
                    if (denial_response && denial_response.content) {
                        console.log(chalk.green('Banjin: ') + denial_response.content);
                    }
                }
            } else if (input.startsWith('/')) {
                const shouldExit = await handleSlashCommand(state, input);
                if (shouldExit) break;
                        } else if (input) {
                            state.conversation.push({ role: 'user', content: input });
                            const spinner = ora('Waiting for LLM...').start();
                            const response_message = await callLlmApi(state);
                            spinner.stop();
            
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
                        console.log(chalk.green('Banjin: ') + response_message.content);
                    }
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
}

mainLoop();