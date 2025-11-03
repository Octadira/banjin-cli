# ssh-manager.ts - SSH Server Configuration Management

## Overview
The `ssh-manager.ts` file provides utilities for managing SSH server configurations used by Banjin for remote server connections. It handles loading and saving SSH server definitions from a JSON configuration file, enabling persistent storage of connection details.

## Structure

### Type Definitions
- **SshServer**: Interface for individual SSH server configuration
- **SshServerConfig**: Type for collection of SSH servers keyed by alias

### Core Functions
- **getSshConfigPath()**: Determines path to SSH configuration file
- **loadSshServers()**: Loads SSH server configurations from disk
- **saveSshServers(config)**: Saves SSH server configurations to disk

## Functionality

### Configuration File Management

#### File Location
- Configuration stored in `.banjin/ssh-servers.json`
- Uses `findConfigPath()` from config.ts to locate config directory
- Creates path relative to user's configuration directory

#### File Format
SSH servers stored as JSON object:
```json
{
    "prod-server": {
        "user": "admin",
        "host": "192.168.1.100",
        "keyPath": "~/.ssh/production_key"
    },
    "staging": {
        "user": "deploy",
        "host": "staging.example.com"
    }
}
```

### Data Persistence

#### Loading Configuration
- Reads and parses JSON configuration file
- Returns empty object if file doesn't exist
- Graceful error handling for malformed JSON
- Logs errors to console for debugging

#### Saving Configuration
- Writes formatted JSON with 2-space indentation
- Creates configuration directory if needed
- Returns boolean success indicator
- Comprehensive error handling and logging

### SSH Server Schema

#### Required Fields
- **user**: SSH username for connection
- **host**: Server hostname or IP address

#### Optional Fields
- **keyPath**: Path to SSH private key file (defaults to standard SSH keys)

## Integration Points

### With Command Handlers
- Used by `/list-ssh`, `/add-ssh`, `/rm-ssh` commands
- Provides server configurations for connection establishment
- Enables dynamic SSH server management

### With SSH Connection Logic
- Server configurations loaded during connection setup
- Key paths and credentials used for authentication
- Host information stored in application state

### With Configuration System
- Leverages existing config directory structure
- Follows same error handling patterns as other config files
- Integrates with Banjin's configuration management

## Design Patterns

### Data Access Object (DAO) Pattern
- Abstracts file system operations behind clean interface
- Centralizes SSH configuration persistence logic
- Provides consistent error handling for I/O operations

### Configuration Pattern
- Separates configuration data from application logic
- Enables runtime configuration changes
- Supports multiple SSH server definitions

## Best Practices

### Error Handling
- **Defensive Programming**: Handles missing files gracefully
- **Detailed Logging**: Provides specific error messages for troubleshooting
- **Type Safety**: Strong typing for configuration objects

### File System Operations
- **Atomic Writes**: Uses synchronous file operations for reliability
- **Path Validation**: Validates configuration directory existence
- **Permission Awareness**: Handles file system permission errors

### Data Integrity
- **JSON Validation**: Ensures configuration files are valid JSON
- **Schema Enforcement**: TypeScript interfaces enforce data structure
- **Backup Safety**: No risk of partial writes corrupting configuration

## Usage Examples

### Adding SSH Servers
```typescript
const servers = loadSshServers();
servers['new-server'] = {
    user: 'ubuntu',
    host: 'ec2-123-456-789.compute.amazonaws.com',
    keyPath: '~/.ssh/aws-key.pem'
};
saveSshServers(servers);
```

### Listing Available Servers
```typescript
const servers = loadSshServers();
console.log(Object.keys(servers)); // ['prod-server', 'staging', 'new-server']
```

### Connecting to Servers
```typescript
const servers = loadSshServers();
const server = servers['prod-server'];
// Use server.user, server.host, server.keyPath for SSH connection
```

The SSH manager provides a simple yet robust foundation for managing multiple server connections, enabling Banjin to maintain persistent SSH server configurations across sessions.