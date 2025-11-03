# Technical Documentation - config.ts

## Overview

`config.ts` is the central configuration management module for the Banjin CLI application. It handles application state, configuration loading, first-run setup, and template synchronization. This file defines the core data structures and manages the entire application lifecycle.

## Core Data Structures

### SSHState Interface
```typescript
export interface SSHState {
    client: any; // ssh2 client instance
    host_string: string | null; // user@host format
    ssh_alias: string | null; // alias from ssh-servers.json
}
```

- **client**: SSH2 connection object for remote operations
- **host_string**: Current SSH connection in `user@host` format
- **ssh_alias**: Named alias for the connection (if applicable)

### AppState Interface
```typescript
export interface AppState {
    original_config: any;           // Immutable config backup
    session_config: any;            // Mutable session config
    system_context: string;         // Combined context from files
    conversation: any[];            // Chat history with LLM
    ssh: SSHState;                  // SSH connection state
    is_confirming: boolean;         // Tool confirmation pending
    pending_tool_call: any;         // Queued tool execution
    configPath: string;             // Configuration directory
    mcp_servers: any;               // MCP server configurations
    loadedContextFiles: string[];   // Context files loaded
    dynamic_tool_defs: any[];       // MCP tool definitions
    dynamic_tool_impls: { [key: string]: Function }; // Tool implementations
    mcp_successful_servers: string[]; // Successfully loaded MCP servers
    pendingSuggestion?: any;        // Profile suggestions
    pendingActionPlan?: any;        // Action plans awaiting approval
}
```

## Key Functions

### 1. **loadInitialState()** - Main Entry Point
```typescript
export async function loadInitialState(): Promise<AppState | null>
```

**Purpose**: Initializes the entire application state
**Process**:
1. Finds or creates configuration directory
2. Loads YAML configuration
3. Loads MCP server configurations
4. Combines context files
5. Initializes empty conversation
6. Returns complete AppState or null on failure

### 2. **Configuration Directory Resolution**
```typescript
function findConfigDir(): string | null
```

**Priority Order**:
1. `~/.banjin/` (global user config)
2. `./.banjin/` (local project config)
3. Returns `null` if neither exists

### 3. **Template Synchronization**
```typescript
async function syncTemplates(configDir: string, options: { promptContext: boolean })
```

**Features**:
- Updates `config.yaml` while preserving user settings
- Prompts for `context.md` updates
- Creates backups before overwriting
- Cleans up old backup files (keeps last 5)

### 4. **First-Run Setup**
```typescript
async function setupConfiguration(): Promise<string | null>
```

**Creates**:
- Configuration directory
- `config.yaml` with default settings
- `mcp-servers.json` empty template
- `context.md` from template
- `ssh-servers.json` empty registry
- Sets secure permissions (600) on config files

## Configuration File Structure

### config.yaml Structure
```yaml
llm:
  baseUrl: "https://api.groq.com/openai/v1"
  model: "llama-3.1-8b-instant"
  temperature: 0.7
  apiKey: "YOUR_API_KEY_HERE"

cli:
  input_mode: "line"        # line|editor|multiline
  output_format: "text"     # text|markdown
  tool_timeout: 300         # seconds, 0 = disabled
```

### mcp-servers.json Structure
```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"],
      "env": {}
    }
  }
}
```

### ssh-servers.json Structure
```json
{
  "server-alias": {
    "host": "example.com",
    "user": "username",
    "keyPath": "/path/to/key",
    "port": 22
  }
}
```

## Context Loading System

### Multi-Level Context
1. **Global Context**: `~/.banjin/context.md`
2. **Local Context**: `./.banjin/context.md` (if different from global)
3. **Combined**: Joined with `---` separator

### Context Injection
- Added as system message to conversation
- Provides persistent instructions to LLM
- Can be updated without restarting

## Backup and Recovery System

### Automatic Backups
- Configuration files backed up before updates
- Timestamped backup names: `config.yaml.bak-2025-11-03T10-30-00-000Z`
- Maximum 5 backups kept (oldest deleted)

### Recovery Process
```typescript
function copyWithBackup(src: string, dest: string, doCleanup: boolean = true)
// 1. Create timestamped backup of existing file
// 2. Copy new file
// 3. Clean up old backups if enabled
```

## Security Features

### File Permissions
- Configuration files set to `chmod 600` (owner read/write only)
- Prevents accidental exposure of API keys

### Input Validation
- YAML parsing with error handling
- Required field validation
- Safe defaults for missing configurations

### Path Resolution
- Safe path handling to prevent directory traversal
- Template resolution with fallback paths
- Absolute path enforcement for critical files

## Error Handling

### Configuration Errors
- Clear error messages for missing files
- Graceful fallbacks to minimal configurations
- Setup retry mechanisms

### File System Errors
- Permission error handling
- Directory creation with recursive option
- Backup failure recovery

## Integration Points

### With Other Modules
- **index.ts**: Uses `loadInitialState()` for app initialization
- **commands.ts**: Accesses AppState for command execution
- **llm.ts**: Uses session_config for API settings
- **ssh-manager.ts**: Manages SSH state within AppState

### External Dependencies
- **fs**: File system operations
- **path**: Path manipulation
- **os**: OS-specific path resolution
- **yaml**: Configuration parsing
- **@inquirer/confirm**: User prompts during setup

## Testing Considerations

### Mock Requirements
- File system mocking for config loading
- YAML parsing mocks
- SSH connection mocks
- MCP server mocks

### Test Scenarios
- First-run setup
- Configuration updates
- Backup creation/cleanup
- Context file loading
- Error recovery

## Performance Considerations

### Startup Time
- Lazy loading of MCP servers
- Cached configuration parsing
- Minimal file I/O during initialization

### Memory Usage
- Deep copy of configuration for immutability
- Efficient context file concatenation
- Cleanup of temporary backup files

## Maintenance Notes

### Version Compatibility
- Tracks `last-synced-version` for template updates
- Backward compatibility for configuration formats
- Migration paths for breaking changes

### Configuration Evolution
- Template-based updates preserve user settings
- Automatic cleanup prevents disk bloat
- Secure defaults for new installations

This module serves as the foundation of Banjin, ensuring reliable configuration management and application state throughout the CLI lifecycle.</content>
<parameter name="filePath">/Users/dragneaadrian/Working/Banjin/documentatie-tehnica/config.ts.md