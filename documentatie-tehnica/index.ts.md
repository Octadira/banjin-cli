# Technical Documentation - index.ts

## Overview

`index.ts` is the main entry point for the Banjin CLI application. It orchestrates the entire application lifecycle, handles user input/output, manages the main interaction loop, and coordinates between all major subsystems. This file implements the core REPL (Read-Eval-Print Loop) that powers the interactive CLI experience.

## File Structure and Components

### Shebang and Imports
```typescript
#!/usr/bin/env node
// Core CLI libraries for user interaction
import input from '@inquirer/input';
import editor from '@inquirer/editor';
import confirm from '@inquirer/confirm';

// System and utility libraries
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';

// Application modules
import { AppState, loadInitialState } from './config';
import { handleSlashCommand } from './commands';
import { callLlmApi } from './llm';
import { available_tools } from './tools';
import { discoverMcpTools } from './mcp-tools';
import { notifyOnUpdate } from './update';

// Package info and utilities
const pkg = require('../package.json');
import ora from 'ora';
import { ensureMarkdownRenderer, renderForTerminal } from './terminal-render';
import { ensureTerminalCleanState } from './terminal-utils';
```

## Core Functions

### 1. **getMultilineInput()** - Multi-line Input Handler
```typescript
function getMultilineInput(): Promise<string | null>
```

**Purpose**: Handles multi-line text input for complex queries
**Features**:
- Blank line submission
- Ctrl+C cancellation
- Visual feedback with `...` prompts
- Proper cleanup of readline interface

### 2. **getInputWithHistory()** - History-Aware Input
```typescript
function getInputWithHistory(message: string, history: string[]): Promise<string>
```

**Purpose**: Provides input with command history navigation
**Features**:
- Up/Down arrow navigation through history
- Session-based history (cleared on restart)
- Ctrl+C cancellation support
- Readline interface management

### 3. **checkContextUpdate()** - Context Synchronization
```typescript
async function checkContextUpdate(state: AppState)
```

**Purpose**: Checks for and applies context.md template updates
**Process**:
- Compares user context with template
- Prompts for update approval
- Preserves user modifications
- Handles version conflicts

### 4. **displayUsageSummary()** - Status Display
```typescript
function displayUsageSummary(state: AppState)
```

**Purpose**: Shows loaded resources on startup
**Displays**:
- Number of context files loaded
- MCP servers configured and loaded
- Dynamic tools discovered

## Main Application Loop

### Initialization Sequence
```typescript
async function mainLoop() {
    // 1. Check for updates
    notifyOnUpdate();

    // 2. Load application state
    const state: AppState | null = await loadInitialState();
    if (!state) return;

    // 3. Clear session history
    const historyFile = path.join(state.configPath, 'input_history.txt');
    if (fs.existsSync(historyFile)) {
        fs.unlinkSync(historyFile);
    }
    let history: string[] = [];

    // 4. Initialize markdown renderer if needed
    if (state.session_config?.cli?.output_format === 'markdown') {
        await ensureMarkdownRenderer();
    }

    // 5. Check context updates
    await checkContextUpdate(state);

    // 6. Display welcome message
    console.log(chalk.bold.green(`Banjin AI Assistant [TS Version v${pkg.version}]. Use /help for commands.`));
    console.log(chalk.dim(`Context loaded from: ${state.configPath}`));

    // 7. Discover MCP tools
    const discoverySpinner = ora('Discovering MCP tools...').start();
    const discovered = await discoverMcpTools(state.mcp_servers);
    state.dynamic_tool_defs = discovered.definitions;
    state.dynamic_tool_impls = discovered.implementations;
    state.mcp_successful_servers = discovered.successfulServers;
    discoverySpinner.stop();

    // 8. Display resource summary
    displayUsageSummary(state);
}
```

### Main Interaction Loop
```typescript
while (true) {
    try {
        // --- Main Input Logic --- //
        let final_input: string | null = null;

        if (state.is_confirming) {
            // Handle tool confirmation
            const confirmation = await confirm({ message: chalk.bold.yellow('Approve? (y/n)> ') });
            final_input = confirmation ? 'y' : 'n';
            state.is_confirming = false;
            // Process tool execution...
        } else {
            // Handle user input
            const promptPrefix = state.ssh.host_string
                ? chalk.bold.cyan(`[${state.ssh.host_string}]> `)
                : chalk.bold('> ');

            const inputMode = state.session_config.cli?.input_mode || 'line';
            const firstLine = inputMode === 'line'
                ? await getInputWithHistory(promptPrefix, history)
                : await input({ message: promptPrefix });

            // Process commands vs regular input
            if (firstLine.startsWith('/') || firstLine.startsWith('.')) {
                // Handle slash commands
                const command = firstLine.startsWith('/') ? firstLine : '/' + firstLine.slice(1).trim();
                const shouldExit = await handleSlashCommand(state, command);
                if (shouldExit) break;
                continue;
            } else if (firstLine) {
                // Add to history and process input modes
                if (inputMode === 'line') {
                    history.unshift(firstLine);
                    if (history.length > 1000) {
                        history = history.slice(0, 1000);
                    }
                    fs.writeFileSync(historyFile, history.join('\n'), 'utf8');
                }

                if (inputMode === 'editor') {
                    // Handle editor mode...
                } else if (inputMode === 'multiline') {
                    // Handle multiline mode...
                } else {
                    final_input = firstLine;
                }
            }
        }

        // Process final input through LLM
        if (final_input) {
            state.conversation.push({ role: 'user', content: final_input });

            const spinner = ora({ text: 'Waiting for LLM...', spinner: 'dots' });
            spinner.start();

            const response_message = await callLlmApi(state);

            if (response_message) {
                if (response_message.tool_calls) {
                    // Handle tool calls...
                } else if (response_message.content) {
                    const rendered = renderForTerminal(state, response_message.content);
                    console.log(chalk.green('Banjin:') + '\n' + rendered);
                }
            }
        }

    } catch (error: any) {
        // Handle errors and exit conditions
        if (error.message.includes('User force closed')) {
            console.log(chalk.yellow('\nGoodbye!'));
        } else {
            console.log(chalk.red(`\nAn unexpected error occurred: ${error.message}`));
        }
        break;
    }
}
```

## Input Mode Handling

### 1. **Line Mode** (Default)
- Single line input with history navigation
- Up/Down arrows cycle through history
- Enter submits input

### 2. **Editor Mode**
- Opens external editor for multi-line input
- Validates content changes
- Cancels if no changes made

### 3. **Multiline Mode**
- In-terminal multi-line input
- Blank line submits
- Visual feedback with `...` prompts

## Tool Execution Flow

### Confirmation System
```typescript
if (state.is_confirming) {
    const confirmation = await confirm({ message: chalk.bold.yellow('Approve? (y/n)> ') });
    final_input = confirmation ? 'y' : 'n';
    state.is_confirming = false;

    if (final_input.toLowerCase() === 'y') {
        // Execute approved tool
        const function_name = tool_call.function.name;
        const function_args = JSON.parse(tool_call.function.arguments);

        const tool_response = await function_to_call(state, function_args);
        // Add to conversation and get LLM follow-up
    }
}
```

### Timeout and Cancellation
- **ESC key**: Cancels running tool execution
- **Timeout**: Configurable timeout (default 300s)
- **Progress indicators**: Spinner with status updates

## Error Handling and Cleanup

### Global Error Handling
```typescript
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    ensureTerminalCleanState();
    process.exit(1);
});
```

### Terminal State Management
- **ensureTerminalCleanState()**: Resets terminal after interruptions
- **Readline cleanup**: Proper disposal of input interfaces
- **Spinner management**: Prevents orphaned spinners

## Integration Points

### With Core Modules
- **config.ts**: Application state management
- **commands.ts**: Slash command processing
- **llm.ts**: AI API communication
- **tools.ts**: Tool execution system
- **mcp-tools.ts**: Dynamic tool discovery

### With Utility Modules
- **terminal-render.ts**: Output formatting
- **terminal-utils.ts**: Terminal state management
- **update.ts**: Version checking and updates

## Performance Considerations

### Startup Optimization
- Lazy initialization of markdown renderer
- Asynchronous MCP tool discovery
- Cached configuration loading

### Memory Management
- Session-based history (not persistent)
- Conversation cleanup on exit
- Efficient tool response handling

### User Experience
- Non-blocking update notifications
- Progress indicators for long operations
- Graceful error recovery

## Security Features

### Input Sanitization
- Command validation before execution
- Path safety checks for file operations
- SQL injection prevention in database commands

### Execution Safety
- Tool confirmation system
- Timeout protection against hanging operations
- Cancellation support for user control

### Data Protection
- Secure credential handling
- Encrypted SSH connections
- Safe file permission management

## Testing Considerations

### Mock Requirements
- Input/output stream mocking
- LLM API response mocking
- File system operation mocking
- SSH connection mocking

### Integration Testing
- End-to-end command flows
- Multi-mode input testing
- Error condition handling
- Tool execution workflows

This file serves as the heart of Banjin, coordinating all user interactions and system operations into a cohesive, powerful CLI experience.</content>
<parameter name="filePath">/Users/dragneaadrian/Working/Banjin/documentatie-tehnica/index.ts.md