# Banjin - The AI CLI Assistant for Developers & SysAdmins 🤖

**Banjin** is a powerful, extensible AI command-line assistant designed for developers, system administrators, and power users. It acts as an intelligent agent that can operate on your local machine or connect to remote servers via SSH, allowing you to perform complex tasks using natural language.

> *Banjin was crafted with the help of an AI assistant, making it an application by AI, for AI (and the humans who command them). 😉*

Think of it as a junior developer or sysadmin you can chat with, capable of executing commands, managing files, and integrating with external services, all while asking for your approval before taking any action.

## Core Features

-   **Remote Operations via SSH ☁️:** Securely connect to any server and instruct the AI to perform tasks, manage files, or run diagnostics directly on the remote machine.
-   **Intelligent Tool-Based Agent 🧠:** Banjin uses a Large Language Model (LLMs) that can reason and decide which tools to use to accomplish your goals.
-   **Interactive Confirmation ✅:** For safety, Banjin will always show you the exact command or action it intends to perform and ask for your explicit approval before execution.
-   **Extensible with MCP Tools 🔧:** The "Model Context Protocol" (MCP) tool system allows you to extend Banjin's capabilities.
-   **Context-Aware 📚:** Provide the AI with custom instructions and context through `.md` files, tailoring its behavior and knowledge to your specific project or environment.
-   **Session Management 💾:** Save, load, and reset conversations to manage different tasks and contexts efficiently.
-   **Self-Updating 🚀:** Use the `/update` command to easily keep Banjin at the latest version.

## Installation 🚀

**Prerequisites:** Node.js 20 or higher is required.

```bash
npm install -g banjin
```

## Initial Configuration ⚙️

On the first run, Banjin will guide you through creating a global configuration directory at `~/.banjin`.

This directory will contain:

-   `config.yaml`: The main configuration file. **You must edit this file to add your LLMs API key.**
-   `mcp-servers.json`: Configuration for your custom MCP tools.
-   `context.md`: A file for your global system context and instructions for the AI.
-   `ssh-servers.json`: A file to store your SSH server aliases and connection details.

**Security Note: 🛡️** Your `config.yaml` contains sensitive API keys. It is highly recommended to secure this file by setting its permissions to be readable only by you (e.g., `chmod 600 ~/.banjin/config.yaml`).

## LLMs Compatibility 🤝

Banjin is built and tested to work with the high-speed **[Groq](https://groq.com/)** inference engine. It leverages their API for tool-use capabilities.

Theoretically, it should be compatible with any OpenAI-compatible API endpoint that supports tool calling (function calling). However, it has not been formally tested with services other than Groq.

### Compatible Models (via Groq)

*(Information last updated: 2025-10-14)*

This application requires a model that supports **Tool Use**. Below is a list of models available via Groq that are reported to be compatible.

**Recommended by Groq for Tool Use:**
- `llama-3.1-8b-instant`
- `llama-3.3-70b-versatile`

**Other Compatible Models:**
- `meta-llama/llama-4-maverick-17b-128e-instruct`
- `moonshotai/kimi-k2-instruct`
- `qwen/qwen3-32b`
- `openai/gpt-oss-120b`

## What are MCP Tools? 🛠️

The "Multi-Custom Provider" (MCP) system is what makes Banjin truly powerful. It allows you to define custom tools that the AI can use. A tool can be a simple local command or a call to a web service.

For example, you could configure an MCP tool to:
-   Search your company's internal documentation.
-   Fetch the status of your CI/CD pipeline.
-   Create a new ticket in your project management system.

You define these tools in `mcp-servers.json`. The AI will then be able to see these tools and use them when appropriate to answer your requests.

## Commands ❓

Banjin supports slash commands (e.g., `/help`) for direct instructions. You can also use a dot prefix (e.g., `.help`) to prevent the command from being sent to the LLMs.

<details>
<summary>Click to view all commands</summary>

  **Chat & Context:**
  /context             - Display the current system context
  /resetchat           - Reset the current conversation memory
  /savechat            - Save the conversation to a file
  /loadchat <filename> - Load a conversation from a file
  /chats-list          - List saved chat files
  /chats-delete <file> - Delete a saved chat file

  **LLMs & Model:**
  /model <model_name>  - Change the LLMs model for this session
  /temp <0.0-2.0>      - Change the LLMs temperature for this session
  /model-reset         - Reset model to the value from config file
  /temp-reset          - Reset temperature to the value from config file

  **Interface:**
  /mode <line|editor|multiline>     - Change the input mode for the current session
  /output [markdown|text] [--save]  - Show or set output format; use --save to persist to config
  /output-reset                     - Reset output format to default from config
  /timeout [seconds] [--save]       - Show or set tool execution timeout (0=disabled); use --save to persist
  /timeout-reset                    - Reset timeout to default from config

  **Connections & Files:**
  /status              - Show current SSH connection status
  /connect <alias|user@host> - Connect to a server via alias or direct connection
  /disconnect          - Disconnect from the remote server
  /ls-files [path]     - List files and directories
  /list-ssh            - List all saved SSH server aliases
  /add-ssh <alias> <user@host> [-i key_path] - Add or update a saved SSH server
  /rm-ssh <alias>      - Remove a saved SSH server

  **MCP Tools:**
  /mcp-list            - List available MCP servers from config
  /mcp-tools           - List all discovered tools from loaded MCP servers
  /mcp-reload          - Reload the MCP servers configuration

  **General:**
  /help                - Show this help message
  /clear               - Clear the screen
  /update              - Check for application updates

</details>

## Output formatting (Markdown vs Text) 🖨️

By default, Banjin displays responses as plain text for maximum compatibility.

- Session toggle:
  - Use `/output markdown` to enable Markdown rendering for the current session
  - Use `/output text` to switch back to plain text
  - Use `/output-reset` to reset to your config default
- Persist preference:
  - Use `/output markdown --save` (or `--save` with `text`) to write your preference to `~/.banjin/config.yaml`
  - The setting is stored at `cli.output_format` and can be `"text"` (default) or `"markdown"`

When Markdown is enabled, Banjin uses the marked + marked-terminal stack to render headings, lists, code blocks, tables, and links more readably in your terminal. If the renderer packages are unavailable for any reason, Banjin will gracefully fall back to plain text.

## Tool execution control ⏱️

Banjin provides safety features for long-running or stuck tool executions:

- **Cancel with ESC**: During tool execution, press the ESC key to cancel the operation immediately.
- **Automatic timeout**: Control how long tools can run before timing out:
  - Default: 300 seconds (5 minutes) - reasonable for most server admin tasks
  - Runtime control:
    - `/timeout` - Show current timeout setting
    - `/timeout 600` - Set timeout to 10 minutes for current session
    - `/timeout 0` - Disable timeout (infinite wait)
    - `/timeout 300 --save` - Set and save to config permanently
    - `/timeout-reset` - Reset to config default
  - Config file: Set `cli.tool_timeout` in `~/.banjin/config.yaml`
  - Timeout is preserved across updates

When a tool times out or is cancelled, Banjin will notify the LLMs so it can adjust its approach or suggest alternatives.


## Development 👨‍💻

If you want to contribute to the project:

```bash
# 1. Clone the repository
git clone https://github.com/octadira/banjin-cli.git

# 2. Navigate to the project directory
cd banjin-cli

# 3. Install dependencies
npm install

# 4. Run the app locally
npm start
```

## Server Profiling & Audit 🔍

Banjin includes server profiling and audit logging capabilities for sysadmins and developers. All data is stored locally—no automatic upload or sharing.

### Three-Tier Collection Strategy (Phase 3)

**LIGHT mode** (~2 seconds):
- Basic OS info, RAM, hostname
- Minimal performance impact
- Use for: Quick baseline checks

**DEFAULT mode** (~1-2 seconds):
- Full hardware inventory
- Top processes, disk usage
- Security basics (SSH port, firewall)
- Use for: Regular profiling

**FULL mode** (~5-10 seconds):
- **Network discovery**: 15+ listening ports, open connections
- **Security baseline**: Firewall status, SSH config, failed services tracking
- **Performance metrics**: CPU%, memory usage, load average, process count (LIVE data)
- **Service health**: Systemd services, failed services, failed logins (1h)
- **Kernel info**: Full kernel version, boot time
- Use for: Sysadmin-grade context for LLMs analysis

### Data Structures

**ServerProfile** (full server profile with FULL mode extensions):
```typescript
{
  id: 'server-01',
  collectedAt: '2025-10-17T19:50:00Z',
  mode: 'full',
  hardware: { cpu, cores, ram_gb, disk_gb, disks },
  os: { name, version, kernel, arch },
  users: [ { username, uid, shell, home } ],
  services: [ { name, status, port } ],
  network: {
    hostname,
    public_ip,
    interfaces: [ { name, ip, mac } ],
    listening_ports: [ { port, protocol, service } ],  // ✨ NEW: FULL mode only
    open_connections: number                            // ✨ NEW: FULL mode only
  },
  // ✨ NEW FULL Mode Sections:
  security?: {
    firewall_status: string,
    firewall_enabled: boolean,
    ssh_port: number,
    ssh_root_login: boolean,
    failed_services: string[]
  },
  performance?: {
    cpu_usage_percent: number,
    memory_usage_percent: number,
    memory_used_gb: number,
    load_average: { one, five, fifteen },
    process_count: number
  },
  kernel_info?: {
    kernel_version: string,
    boot_time: string
  },
  recent_alerts?: {
    error_count_1h: number,
    failed_services: string[],
    failed_login_count_1h: number
  },
  tags: ['production'],
  notes: 'Main web server'
}
```

**ActionLogEntry** (audit log entry):
```typescript
{
  timestamp: '2025-10-17T19:51:00Z',
  user: 'adrian',
  action: 'exec',
  details: 'ssh server-01 "systemctl restart nginx"',
  status: 'success',
  error: undefined
}
```

### Commands

**Profile Commands:**
- `/profile collect [--light|--full]` – Collect server profile with optional mode (default: DEFAULT)
- `/profile show [hostname]` – Display saved profile as JSON
- `/profile summarize [hostname]` – Brief summary with tags and notes
- `/profile diff <profile1> <profile2>` – Compare two profiles (stub)
- `/profile send [--dry-run]` – Send profile to external service (stub)

**Audit Commands:**
- `/audit tail [--lines N] [--host hostname]` – Show last N audit entries
- `/audit show [--host hostname]` – Show all audit entries
- `/audit export --format json|csv [--host hostname]` – Export as JSON or CSV
- `/audit search <pattern> [--host hostname]` – Search audit log (stub)

**Storage Commands:**
- `/storage <stats|prune>` – Storage statistics and cleanup (stub)

### Example Workflow

```bash
# Connect to a remote server
/connect myserver

# Collect full profile (with security & performance analysis)
/profile collect --full

# View collected data
/profile show

# Export audit log
/audit export --format json

# Ask LLMs for analysis
"Analyze this server - suggest security improvements based on the full profile"
```

### Hybrid Mode: LLMs Tool Integration

Banjin uses three intelligent tools for sysadmin recommendations:

1. **`save_profile_notes`** – Auto-save observations to profile (no popup)
2. **`suggest_profile_update`** – Propose profile improvements with user confirmation (popup yes/no)
3. **`suggest_action_plan`** – Recommend step-by-step fixes with risk assessment (popup with steps)

The LLMs can use these tools to propose improvements, but **all actions require your explicit approval** before execution.

**All data is stored locally under `~/.banjin`. Nothing is sent to any server unless you explicitly implement it.**

Limits and policies can be configured in `config.yaml` (see `cli.profile`, `cli.audit`, `cli.storage`, `cli.privacy`).

---