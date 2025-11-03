# mcp-tools.ts - Model Context Protocol Integration

## Overview
The `mcp-tools.ts` file implements integration with the Model Context Protocol (MCP), enabling Banjin to discover and utilize tools from external MCP servers. It supports both HTTP-based and stdio-based MCP server connections, dynamically generating tool definitions and implementations at runtime.

## Structure

### Types & Interfaces
- **DiscoveredMcpTools**: Return type containing tool definitions, implementations, and successful server connections

### Main Function
- **discoverMcpTools(mcp_servers)**: Discovers and configures MCP tools from server configurations

## Functionality

### MCP Server Discovery
The system iterates through configured MCP servers and attempts to connect:

#### Transport Types
- **HTTP Transport**: Uses `StreamableHTTPClientTransport` for web-based MCP servers
- **Stdio Transport**: Uses `StdioClientTransport` for command-line MCP servers with `--json` flag

#### Connection Process
- Creates MCP client instances for each server
- Establishes transport connections
- Calls `listTools()` to discover available tools
- Tracks successfully connected servers

### Dynamic Tool Generation

#### Naming Convention
- Tools are prefixed with server name: `{serverName}_{toolName}`
- Hyphens converted to underscores for valid function names
- Example: `filesystem_read_file` for filesystem server's read_file tool

#### Implementation Creation
- Generates wrapper functions for each discovered tool
- Creates new client connections for each tool execution
- Handles argument passing and result formatting
- Manages connection lifecycle (connect/close)

### Error Handling & Resilience

#### Connection Failures
- Gracefully handles connection errors without crashing
- Logs warnings for failed server connections
- Continues discovery process for remaining servers

#### Tool Execution Errors
- Catches and formats MCP tool execution errors
- Distinguishes between different error types (Axios, generic)
- Provides detailed error messages for debugging

### Tool Definition Generation
Creates OpenAI-compatible function schemas:
```typescript
{
    type: "function",
    function: {
        name: dynamicToolName,
        description: tool.description,
        parameters: tool.inputSchema,
    },
}
```

## Integration Points

### With Configuration System
- Reads MCP server configurations from `mcp_servers.mcpServers`
- Supports both URL and command-based server definitions
- Inherits environment variables from parent process

### With Tools System
- Tool definitions added to `state.dynamic_tool_defs`
- Implementations registered in `available_tools`
- Seamlessly integrated with core Banjin tools

### With LLM API
- Dynamic tools available during LLM function calling
- No restart required when adding new MCP servers
- Real-time tool discovery and registration

## Design Patterns

### Factory Pattern
- Dynamically creates tool implementations at runtime
- Generates consistent wrapper functions for different MCP tools
- Abstracts transport and connection details

### Adapter Pattern
- Converts MCP tool schemas to OpenAI function calling format
- Normalizes different transport types behind common interface
- Handles protocol-specific requirements transparently

### Registry Pattern
- Maintains collections of tool definitions and implementations
- Provides lookup mechanisms for tool execution
- Supports dynamic registration and discovery

## Best Practices

### Connection Management
- **Per-Execution Connections**: Creates new client instances for each tool call
- **Proper Cleanup**: Ensures client connections are closed after use
- **Resource Efficiency**: Avoids keeping persistent connections open

### Error Resilience
- **Non-Blocking Discovery**: Failures don't prevent other servers from loading
- **Graceful Degradation**: Continues operation with partial MCP tool availability
- **Detailed Logging**: Provides actionable error information

### Performance Considerations
- **Parallel Discovery**: Uses `Promise.all()` for concurrent server connections
- **Lazy Loading**: Tools discovered once at startup, not per request
- **Efficient Transport**: Chooses appropriate transport based on server type

### Security & Reliability
- **Input Validation**: Validates server configurations before connection attempts
- **Error Isolation**: Tool execution errors don't affect other operations
- **Transport Security**: Supports secure HTTP connections for remote servers

## Configuration Format
MCP servers configured in JSON format:
```json
{
    "mcpServers": {
        "filesystem": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
        },
        "git": {
            "url": "http://localhost:3001"
        }
    }
}
```

## Usage Examples
- **File System Tools**: Access local filesystem operations through MCP
- **Git Integration**: Version control operations via MCP server
- **Database Tools**: SQL operations through database MCP servers
- **API Integrations**: External service interactions via MCP

The MCP integration enables Banjin to extend its capabilities by leveraging the growing ecosystem of MCP-compatible tools and services.