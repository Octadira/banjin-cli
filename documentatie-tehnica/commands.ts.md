# commands.ts - Command Dispatcher

## Overview
The `commands.ts` file serves as the central command dispatcher for the Banjin CLI application. It imports all command handler functions and routes incoming slash commands to their appropriate handlers based on the command name.

## Structure

### Imports
- **AppState**: Core application state type from config.ts
- **Command Handlers**: Individual handler functions for each slash command, imported from their respective modules in the `cmd/` directory

### Main Function
- **handleSlashCommand(state: AppState, input: string): Promise<boolean>**
  - Parses the input string to extract command and arguments
  - Routes to appropriate handler based on command name
  - Returns boolean indicating if command was handled successfully

## Functionality

### Command Routing
The function uses a switch statement to match command names against imported handlers:

```typescript
switch (command) {
    case '/exit': return await handleExit(state, args);
    case '/help': return await handleHelp(state, args);
    // ... additional cases
}
```

### Command Categories
Commands are organized into logical groups:

- **System Commands**: `/exit`, `/help`, `/clear`, `/status`
- **Connection Management**: `/connect`, `/disconnect`, `/list-ssh`, `/add-ssh`, `/rm-ssh`
- **Chat Management**: `/resetchat`, `/savechat`, `/loadchat`, `/chats-list`, `/chats-delete`
- **Model Configuration**: `/model`, `/temp`, `/mode`, `/output`, `/timeout` and their reset variants
- **File Operations**: `/ls-files`, `/upload`, `/download`, `/watch`, `/tail`
- **MCP Integration**: `/mcp-list`, `/mcp-tools`, `/mcp-reload`
- **System Administration**: `/exec`, `/docker`, `/db-backup`, `/audit`, `/storage`, `/profile`, `/update`

### Error Handling
- Unknown commands are logged to console with "Unknown command: {command}"
- Returns `false` for unhandled commands
- Individual handlers manage their own error handling and validation

## Integration Points

### With index.ts
- Called from the main application loop in `index.ts` when processing slash commands
- Receives current `AppState` and raw input string
- Return value determines if command was processed

### With Command Modules
- Each command handler in `cmd/` directory implements specific functionality
- Handlers receive `AppState` and parsed arguments array
- Handlers can modify application state and perform side effects

### With AppState
- Receives current application state for context
- Command handlers can read from and modify state as needed
- State changes persist across command invocations

## Design Patterns

### Command Pattern
- Each command is encapsulated in its own module
- Central dispatcher routes based on command name
- Consistent interface: `handleCommand(state, args): Promise<boolean>`

### Async/Await
- All command handlers are async functions
- Allows for non-blocking I/O operations and network calls
- Consistent error handling through promise rejections

### Modular Architecture
- Commands are organized in separate files for maintainability
- Easy to add new commands by creating new handler and adding import/case
- Clear separation of concerns between routing and execution

## Best Practices

### Command Registration
- New commands require both import statement and switch case
- Maintain alphabetical ordering in switch statement for readability
- Use consistent naming: `handle{CamelCaseCommand}`

### Error Handling
- Unknown commands logged but don't crash application
- Individual handlers responsible for argument validation
- Graceful degradation for invalid inputs

### Performance
- Lazy loading through imports (no dynamic imports needed)
- Switch statement provides O(1) routing performance
- Async handlers prevent blocking on I/O operations