# Banjin Technical Documentation Index

## Overview
This technical documentation provides comprehensive analysis of the Banjin CLI codebase, a powerful AI assistant for server administration. The documentation covers core architecture, configuration management, LLM integration, tool systems, and command implementations.

## Documentation Structure

### Core Configuration & Build Files
- **[package.json](package.json.md)**: Project metadata, dependencies, scripts, and build configuration
- **[tsconfig.json](tsconfig.json.md)**: TypeScript compilation settings and module resolution
- **[jest.config.js](jest.config.js.md)**: Testing framework configuration and TypeScript integration

### Application Foundation
- **[config.ts](config.ts.md)**: Application state management, configuration loading, and first-run setup
- **[index.ts](index.ts.md)**: Main application loop, input handling modes, and REPL implementation

### Command System
- **[commands.ts](commands.ts.md)**: Central command dispatcher routing slash commands to handlers

### AI & Tool Integration
- **[llm.ts](llm.ts.md)**: LLM API integration with multi-provider support and retry logic
- **[tools.ts](tools.ts.md)**: Function calling tools system for system administration tasks
- **[mcp-tools.ts](mcp-tools.ts.md)**: Model Context Protocol integration for external tools

### Infrastructure Management
- **[ssh-manager.ts](ssh-manager.ts.md)**: SSH server configuration management and persistence

## Key Architecture Components

### State Management
The application uses a centralized `AppState` interface that maintains:
- Session configuration (LLM settings, model parameters)
- SSH connection state
- Conversation history
- Dynamic tool definitions
- Server profiles and pending suggestions

### Command Processing Flow
1. **Input Reception**: Raw user input processed in `index.ts`
2. **Command Dispatch**: Slash commands routed through `commands.ts`
3. **Handler Execution**: Individual command modules handle specific functionality
4. **Tool Integration**: LLM can invoke tools via function calling
5. **State Updates**: Application state modified based on command results

### Tool System Architecture
- **Core Tools**: Built-in system administration functions
- **Dynamic Tools**: MCP-discovered tools from external servers
- **Execution Context**: Automatic local vs remote operation detection
- **Security Boundaries**: Path validation and permission checks

### Configuration Hierarchy
- **Global Config**: Stored in `~/.banjin/config.yaml`
- **SSH Servers**: Managed in `~/.banjin/ssh-servers.json`
- **Server Profiles**: Persistent knowledge base for managed servers
- **MCP Servers**: External tool providers in `mcp-servers.example.json`

## Major Features

### Multi-Provider LLM Support
- OpenRouter, Groq, Together.ai, and generic OpenAI-compatible APIs
- Automatic provider detection and header configuration
- Exponential backoff retry logic for rate limiting
- Model name normalization for provider-specific requirements

### Advanced Tool System
- Function calling with structured JSON responses
- Intelligent output handling for large command results
- SSH-aware operations (local vs remote execution)
- Interactive user confirmations for critical operations

### Server Profiling & Audit
- Persistent server knowledge base
- Interactive suggestion system with user approval
- Action plan proposals with risk assessment
- Audit logging for compliance tracking

### MCP Integration
- Dynamic tool discovery from external servers
- Support for HTTP and stdio-based MCP transports
- Runtime tool registration without restart
- Error isolation and graceful degradation

## Development & Testing
- TypeScript with strict mode and comprehensive type checking
- Jest testing framework with TypeScript integration
- Modular architecture supporting easy extension
- Comprehensive error handling and logging

## Security Considerations
- Path traversal prevention in file operations
- Command injection protection through proper escaping
- API key security and credential management
- Working directory restrictions for local operations

## Future Enhancements
- Additional LLM provider support
- Enhanced profiling and automation features
- Expanded MCP ecosystem integration
- Advanced security and compliance tooling

---

*This documentation was generated through systematic analysis of the Banjin codebase. Each file documentation includes detailed explanations of structure, functionality, integration points, and best practices.*