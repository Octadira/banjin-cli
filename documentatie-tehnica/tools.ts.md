# tools.ts - Function Calling Tools System

## Overview
The `tools.ts` file implements the function calling system that enables the LLM to perform actions on the user's behalf. It defines tool schemas for the LLM API and provides implementations for core system administration tasks, file operations, and profiling features. The system supports both local and remote (SSH) execution contexts.

## Structure

### Constants & Types
- **MAX_OUTPUT_SIZE**: Limits command output to 50KB to prevent API payload issues
- **Interface definitions**: `DfOutput`, `ProcessInfo`, `ServiceStatusInfo` for structured tool responses

### Core Components
- **getToolDefinitions(state)**: Returns tool schemas for LLM API integration
- **available_tools**: Registry of all implemented tool functions
- **Large output handling**: Intelligent truncation for massive command outputs

## Functionality

### Tool Definition System
The `getToolDefinitions` function provides JSON schemas for LLM function calling:

#### Core Tools
- **run_command**: Execute shell commands locally or via SSH
- **write_file**: Write content to files with path validation
- **read_file**: Read file contents with security restrictions
- **get_disk_usage**: Retrieve filesystem usage statistics
- **get_running_processes**: List running processes with optional filtering
- **get_service_status**: Check systemd service states

#### Profiling Tools
- **save_profile_notes**: Auto-save observations to server profiles
- **suggest_profile_update**: Interactive profile updates with user confirmation
- **suggest_action_plan**: Propose remediation plans with risk assessment

### Execution Context Handling

#### Local vs Remote Execution
- **SSH Detection**: Checks `state.ssh.client` to determine execution context
- **Command Escaping**: Proper shell escaping for SSH command execution
- **SFTP Operations**: File operations use SFTP for remote servers

#### Security Boundaries
- **Path Validation**: Prevents directory traversal attacks
- **Working Directory Restriction**: Local operations limited to current directory
- **Command Sanitization**: Input validation for shell commands

### Large Output Management
The `handleLargeOutput` function intelligently handles massive command outputs:

#### Detection Logic
- Identifies recursive operations (`find /`, `grep -r`)
- Calculates output size and line count
- Provides contextual suggestions for reducing output

#### Truncation Strategies
- **Recursive Commands**: Shows helpful suggestions and first 50 lines
- **General Large Output**: Displays first and last preview sections
- **Size Reporting**: Always reports total output size in KB

### Tool Implementations

#### run_command
- **Local**: Uses `child_process.spawn` for direct execution
- **Remote**: SSH command execution with proper error handling
- **Output Processing**: Applies large output handling to all results

#### File Operations (read_file/write_file)
- **Path Resolution**: Converts relative paths to absolute
- **Directory Creation**: Auto-creates parent directories for writes
- **Error Handling**: Distinguishes between file not found and permission errors

#### System Information Tools
- **get_disk_usage**: Parses `df -h` output into structured JSON
- **get_running_processes**: Filters `ps aux` output with grep support
- **get_service_status**: Parses `systemctl status` with regex extraction

### Profiling Integration

#### Profile Management
- **Auto-save**: Direct profile updates without user interaction
- **Interactive Suggestions**: User confirmation via console prompts
- **Action Plans**: Structured remediation proposals with risk levels

#### User Interaction
- **Confirmation Prompts**: Uses `@inquirer/confirm` for yes/no decisions
- **Visual Feedback**: Emojis and formatted output for better UX
- **State Management**: Stores pending suggestions in AppState

## Integration Points

### With LLM System
- **Tool Definitions**: Provided to `llm.ts` for API payload construction
- **Function Calling**: Tools executed based on LLM decisions
- **Context Awareness**: All tools receive current AppState

### With SSH Manager
- **Connection State**: Uses `state.ssh.client` for remote operations
- **Host Information**: Leverages SSH connection details for profiling

### With Profiling System
- **Profile Storage**: Integrates with `profiling.ts` for server knowledge
- **Audit Logging**: Records actions for compliance tracking
- **Suggestion System**: Manages pending profile updates

## Design Patterns

### Strategy Pattern
- Different execution strategies for local vs remote operations
- Provider-specific implementations abstracted behind common interfaces

### Command Pattern
- Tools encapsulate specific operations with consistent signatures
- Easy extension through the `available_tools` registry

### Template Method Pattern
- Common execution flow with context-specific implementations
- Error handling and output processing standardized across tools

## Best Practices

### Error Handling
- **Graceful Degradation**: Continues operation despite individual tool failures
- **Detailed Messages**: Provides specific error context for debugging
- **Type Safety**: Strong typing for all tool parameters and responses

### Performance Optimization
- **Output Limiting**: Prevents API payload bloat from large outputs
- **Efficient Parsing**: Regex-based extraction for system command outputs
- **Lazy Loading**: Tools loaded only when needed

### Security Considerations
- **Input Validation**: Sanitizes file paths and command arguments
- **Permission Checks**: Validates operations against security boundaries
- **Audit Trail**: Logs all tool executions for accountability

### User Experience
- **Interactive Confirmations**: Critical operations require user approval
- **Clear Feedback**: Success/failure messages with actionable information
- **Progressive Disclosure**: Shows appropriate detail levels based on context