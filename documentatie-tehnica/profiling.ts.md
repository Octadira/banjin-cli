# profiling.ts - Server Profiling and Audit System

## Overview
The `profiling.ts` file implements a comprehensive server profiling and audit logging system for Banjin. It collects detailed server information, maintains persistent knowledge bases for managed servers, and provides audit trails for compliance and troubleshooting. The system supports both local and remote server profiling with automatic context detection.

## Structure

### Core Functions
- **collectServerProfile(state, args)**: Collects comprehensive server information
- **loadServerProfile(hostname, configPath)**: Loads saved server profiles
- **summarizeProfile(profile)**: Generates concise profile summaries
- **logAction(hostname, entry, configPath)**: Records actions to audit logs
- **showProfile(hostname, configPath)**: Displays server profile information

### Types & Interfaces
- **ServerProfile**: Complete server information structure
- **ProfileSuggestion**: Profile update suggestions with user confirmation
- **ActionPlan**: Structured remediation action plans
- **ActionLogEntry**: Audit log entry format

### Helper Functions
- **getSystemdServices()**: Extracts systemd service information
- **getListeningPorts()**: Discovers network listening ports
- **getFirewallStatus()**: Checks firewall configuration
- **getPerformanceMetrics()**: Gathers live performance data
- **getFailedServices()**: Identifies failed system services

## Functionality

### Server Profile Collection

#### Profile Identification
- **SSH Alias Priority**: Uses configured SSH alias when available
- **Automatic Fallback**: Falls back to IP/hostname for direct connections
- **Local Detection**: Uses system hostname for local profiling

#### Information Categories
- **Hardware**: CPU model, cores, RAM, disk information
- **Operating System**: Distribution, version, kernel, architecture
- **Network**: Hostname, interfaces, listening ports
- **Services**: Running processes and systemd services
- **Security**: Firewall status, SSH configuration, failed services
- **Performance**: CPU/memory usage, load averages, uptime
- **Kernel Info**: Full uname output, boot time, load averages

#### Collection Methods
- **Remote-Friendly Commands**: Uses universal commands (uname, lscpu, free, df)
- **Graceful Degradation**: Continues collection despite individual command failures
- **Context Awareness**: Adapts data collection based on local vs remote execution

### Profile Management

#### Storage Structure
```
~/.banjin/
├── profiles/
│   └── {hostname}.json
└── audit/
    └── {hostname}.jsonl
```

#### Profile Persistence
- **JSON Format**: Human-readable structured data
- **Directory Creation**: Auto-creates profile directories
- **Error Handling**: Graceful handling of missing profiles

#### Profile Summarization
- **Context Injection**: Generates summaries for LLM context
- **Key Information**: OS, hardware, disks, services
- **Metadata Inclusion**: Tags and notes from profile updates

### Audit Logging System

#### Log Format
- **JSON Lines**: Append-only audit trail
- **Structured Entries**: Timestamp, user, host, action, status
- **Action Types**: Profile collection, tool execution, system changes

#### Log Operations
- **Automatic Logging**: Profile collection triggers audit entries
- **Tail Functionality**: Recent log entries retrieval
- **Export Support**: JSON and CSV export formats

### Interactive Profile Updates

#### Suggestion System
- **Profile Suggestions**: LLM-detected observations with user confirmation
- **Action Plans**: Structured remediation proposals with risk assessment
- **User Interaction**: Console prompts for approval/rejection

#### Update Mechanisms
- **Note Accumulation**: Appends new observations to existing notes
- **Tag Management**: Merges new tags with existing ones
- **Conflict Resolution**: Handles multiple profile file variants

## Integration Points

### With Tools System
- **Profile Collection**: Integrated as core tool functionality
- **Suggestion Tools**: Provides interactive profile update capabilities
- **Audit Integration**: Logs all tool executions for compliance

### With LLM System
- **Context Enhancement**: Profile summaries injected into conversations
- **Action Planning**: Supports LLM-generated remediation plans
- **Observation Recording**: Enables persistent learning from interactions

### With Command System
- **Profile Commands**: `/profile collect`, `/profile show`
- **Audit Commands**: `/audit` for log management
- **SSH Integration**: Automatic profile association with connections

## Design Patterns

### Collector Pattern
- **Modular Collection**: Separate functions for different information types
- **Error Isolation**: Individual collection failures don't stop overall profiling
- **Progressive Enhancement**: Basic info collected first, advanced features added

### Repository Pattern
- **Data Access Layer**: Abstracted file system operations
- **Consistent Interface**: Unified access to profiles and audit logs
- **Error Handling**: Graceful degradation for missing data

### Observer Pattern
- **Audit Logging**: Automatic recording of system interactions
- **Event-Driven**: Actions trigger appropriate logging
- **Non-Intrusive**: Logging doesn't interfere with core functionality

## Best Practices

### Data Collection
- **Non-Invasive**: Uses standard system commands
- **Performance Conscious**: Limits output size and processing
- **Cross-Platform**: Works across different Linux distributions

### Error Resilience
- **Graceful Failures**: Continues operation despite command failures
- **Fallback Mechanisms**: Alternative commands for same information
- **Silent Degradation**: Optional features fail without breaking core functionality

### Security & Privacy
- **Local Data Storage**: Profiles stored in user directory
- **Access Control**: File system permissions protect sensitive data
- **Audit Integrity**: Append-only logs prevent tampering

### Performance Optimization
- **Efficient Parsing**: Regex-based extraction from command output
- **Limited Sampling**: Restricts output size for large datasets
- **Caching Strategy**: Profiles persist across sessions

## Usage Examples

### Profile Collection
```typescript
const result = await collectServerProfile(state, {});
// Result: "Profile collected and saved to /home/user/.banjin/profiles/server1.json"
```

### Profile Summary
```typescript
const profile = loadServerProfile('server1');
const summary = summarizeProfile(profile);
// Result: "Server Facts: Ubuntu 22.04 (4 cores, 16GB RAM). Disks: /: 50GB (25GB used)..."
```

### Audit Logging
```typescript
logAction('server1', {
    user: 'admin',
    host: 'server1',
    action: 'package_update',
    details: 'Updated openssl package',
    status: 'success'
});
```

The profiling system provides Banjin with persistent memory and learning capabilities, enabling more intelligent and context-aware server management interactions.