# Banjin - The AI CLI Assistant for Developers & SysAdmins 🤖

**Banjin** is a powerful, extensible AI command-line assistant designed for developers, system administrators, and power users. It acts as an intelligent agent that can operate on your local machine or connect to remote servers via SSH, allowing you to perform complex tasks using natural language.

> *Banjin was crafted with the help of an AI assistant, making it an application by AI, for AI (and the humans who command them). 😉*

Think of it as a junior developer or sysadmin you can chat with, capable of executing commands, managing files, and integrating with external services, all while asking for your approval before taking any action.

## ⚠️ Disclaimer

**Banjin is currently in active development.** While we strive for stability and security, this software is provided "as is" without any warranties. We are not responsible for any data loss, system damage, security breaches, or other issues that may arise from using this application.

**Key risks to consider:**
- **Data Loss:** Backup your important files before using Banjin, especially when working with remote servers or file operations.
- **Security:** Banjin may execute commands on your behalf. Always review actions before approving them.
- **API Costs:** Using LLMs can incur costs depending on your provider. Monitor your usage.
- **Experimental Features:** Some features are still evolving and may change or have bugs.
- **No Liability:** The developers and contributors are not liable for any damages or losses incurred through the use of this software.

Use at your own risk and always have backups of critical systems.

## Core Features

-   **Remote Operations via SSH ☁️:** Securely connect to any server and instruct the AI to perform tasks, manage files, or run diagnostics directly on the remote machine.
-   **Intelligent Tool-Based Agent 🧠:** Banjin uses a Large Language Model (LLMs) that can reason and decide which tools to use to accomplish your goals.
-   **Interactive Confirmation ✅:** For safety, Banjin will always show you the exact command or action it intends to perform and ask for your explicit approval before execution.
-   **Extensible with MCP Tools 🔧:** The "Model Context Protocol" (MCP) tool system allows you to extend Banjin's capabilities.
-   **Context-Aware 📚:** Provide the AI with custom instructions and context through `.md` files, tailoring its behavior and knowledge to your specific project or environment.
-   **Session Management 💾:** Save, load, and reset conversations to manage different tasks and contexts efficiently.
-   **Input History 📝:** Navigate through previous inputs using arrow keys (up/down) in line input mode. History is session-based and resets when you restart Banjin.
-   **File Transfer 🔄:** Upload and download files securely between local machine and remote servers using `/upload` and `/download` commands.
-   **Real-time Monitoring 👀:** Watch commands execute repeatedly with `/watch` or monitor log files in real-time with `/tail`.
-   **Container Management 🐳:** Full Docker container management with `/docker` command supporting ps, logs, exec, start, stop, and more.
-   **Database Backup 💾:** Automated backups for MySQL, PostgreSQL, and MongoDB databases with `/db-backup`.
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

## LLM Compatibility 🤝

Banjin is built to work with **any OpenAI-compatible API endpoint** that supports tool calling (function calling). It **auto-detects** the provider from your base URL and applies provider-specific configuration automatically.

### Supported Providers

**Tested & Recommended:**

| Provider | Base URL | Model Format | Notes |
|----------|----------|--------------|-------|
| **Groq** ⚡ | `https://api.groq.com/openai/v1` | `llama-3.1-8b-instant` | **Fastest**, recommended for tool use |
| **OpenRouter** 🌐 | `https://openrouter.ai/api/v1` | `provider/model` (e.g., `meta-llama/llama-3.1-8b-instruct`) | Multi-model aggregator, requires HTTP-Referer header (auto-added) |
| **Together.AI** ⚙️ | `https://api.together.ai/v1` | `meta-llama/Llama-3-70b-instruct` | Fast open-source models |
| **Hugging Face** 🤗 | `https://api-inference.huggingface.co/v1` | Standard HF model IDs | Free tier available |
| **Generic OpenAI-Compatible** | `http://localhost:8000/v1` (e.g., local) | Your model's format | Self-hosted, local LLM servers, vLLM, etc. |

### Groq (Recommended)

Fastest inference engine with excellent tool support. Get API key from [groq.com](https://groq.com/).

**Models with tool support:**
- `llama-3.1-8b-instant` (fast, good for tool use)
- `llama-3.3-70b-versatile` (powerful, supports complex tool chains)

### OpenRouter

Multi-model platform with access to hundreds of models including GPT-4, Claude, Llama, and more.

**Setup:**
1. Get API key from [openrouter.ai](https://openrouter.ai/)
2. Model format: `provider/model` (e.g., `meta-llama/llama-3.1-70b-instruct`, `openai/gpt-4o`)
3. Note: Banjin **automatically adds required `HTTP-Referer` header** for OpenRouter

**Popular models on OpenRouter:**
- `openai/gpt-4o` - Most capable
- `meta-llama/llama-3.1-70b-instruct` - Fast, open-source
- `anthropic/claude-3.5-sonnet` - Excellent reasoning
- `openrouter/auto` - Route to best available model

### Together.AI

Fast inference for open-source models.

**Setup:**
1. Get API key from [together.ai](https://together.ai/)
2. Standard OpenAI-compatible format

### Self-Hosted / Local

Use with local LLM servers like **vLLM**, **Ollama**, **LM Studio**, etc.

```bash
# Example: vLLM server running locally
baseUrl: "http://localhost:8000/v1"
model: "meta-llama/Llama-2-7b-chat-hf"
```

### Provider Auto-Detection

Banjin automatically detects your provider from `baseUrl` and applies provider-specific configuration:

- **Groq** → Standard OpenAI headers
- **OpenRouter** → Adds `HTTP-Referer` header (required) + `X-Title` header
- **Together.AI** → Standard OpenAI headers
- **Generic** → Standard OpenAI headers

No manual configuration needed! Just set your `baseUrl` and `apiKey` in `config.yaml`.

### Configuration

Edit `~/.banjin/config.yaml`:

```yaml
llm:
  # Use any supported provider's base URL
  baseUrl: "https://api.groq.com/openai/v1"  # or openrouter.ai, together.ai, etc.
  
  # Model name (format depends on provider)
  model: "llama-3.1-8b-instant"
  
  # Your API key
  apiKey: "YOUR_API_KEY_HERE"
  
  # Temperature (0.0-2.0)
  temperature: 0.5
```

See `config.example.yaml` for more examples of different providers.

---

## Models and Tool Support

**Tool use (function calling) is required by Banjin.** Below are models known to support tools:

**Groq:**
- `llama-3.1-8b-instant` ✅
- `llama-3.3-70b-versatile` ✅

**OpenRouter:**
- Most models support tools, but some free models may have limitations
- Check [openrouter.ai/docs](https://openrouter.ai/docs) for model capabilities

**Together.AI:**
- Most Llama 3 / 3.1 models support tools
- Check provider docs for latest supported models

**Note:** If your chosen model doesn't support tool calling, Banjin will fail with an error message. Switch to a model with tool support.

---

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
   /upload <local> <remote> - Upload file from local to remote server
   /download <remote> <local> - Download file from remote server to local

  **MCP Tools:**
  /mcp-list            - List available MCP servers from config
  /mcp-tools           - List all discovered tools from loaded MCP servers
  /mcp-reload          - Reload the MCP servers configuration

   **General:**
   /exec <command>      - Execute local shell command with output display
   /help                - Show this help message
   /clear               - Clear the screen
   /update              - Check for application updates

   **Monitoring:**
   /watch <command> [interval] - Execute command repeatedly at intervals (default 2s)
   /tail <file> [lines]        - Monitor file in real-time (like tail -f)

   **Container Management:**
   /docker <command> [args] - Docker container operations (ps/logs/exec/start/stop/etc.)

   **Database Operations:**
   /db-backup <type> [args] - Create database backups (mysql/postgresql/mongodb)

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

## Advanced Commands 💪

Banjin includes powerful sysadmin commands for file management, monitoring, containers, and databases:

### File Transfer
```bash
# Upload local file to remote server
/upload ./config.yaml /etc/myapp/config.yaml

# Download remote file to local
/download /var/log/nginx/error.log ./nginx-errors.log
```

### Real-time Monitoring
```bash
# Watch system processes every 5 seconds
/watch "ps aux | grep nginx" 5

# Monitor log file in real-time (shows last 20 lines, then follows)
/tail /var/log/nginx/access.log 20

# Watch remote command
/watch "/exec systemctl status nginx" 10
```

### Docker Management
```bash
# List all containers
/docker ps

# View container logs
/docker logs myapp

# Execute command in running container
/docker exec myapp "ls -la /app"

# Start/stop containers
/docker start nginx
/docker stop nginx
/docker restart nginx

# Remove container
/docker rm old-container

# Pull and build images
/docker pull nginx:latest
/docker build . myapp:v1.0
```

### Database Backups
```bash
# MySQL backup
/db-backup mysql mydatabase root mypassword localhost

# PostgreSQL backup
/db-backup postgresql mydb postgres localhost

# MongoDB backup (creates compressed archive)
/db-backup mongodb mydb localhost 27017
```

All commands work on both local and remote systems (when connected via SSH).

## Security Considerations 🔒

**Important:** These advanced commands have significant security implications. Always understand the risks before use.

### File Transfer Security
- **✅ Encrypted:** Uses SCP over SSH for secure transfer
- **⚠️ Path Risks:** Avoid relative paths that could overwrite system files
- **🛡️ Best Practice:** Use absolute paths and verify destinations

```bash
# ✅ Safe usage
/upload ./config/app.yaml /home/user/config/app.yaml
/download /var/log/nginx/error.log ./server-logs.log

# ❌ Dangerous - avoid these patterns
/upload ../../../etc/passwd /tmp/backup  # Path traversal
/download /etc/shadow ./passwords        # Sensitive data
```

### Monitoring Commands Security
- **✅ Controlled:** Manual refresh (Enter) and cancellation (Ctrl+C)
- **⚠️ Resource Usage:** Continuous monitoring can consume system resources
- **⚠️ Data Exposure:** Log monitoring may reveal sensitive information
- **🛡️ Best Practice:** Use reasonable intervals and monitor resource usage

```bash
# ✅ Safe monitoring
/watch "ps aux | head -10" 5
/tail /var/log/nginx/access.log 50

# ❌ Resource intensive
/watch "find / -name '*.log' 2>/dev/null" 1
/tail /var/log/auth.log  # May expose authentication data
```

### Docker Management Security
- **✅ Isolated:** Operations contained within Docker environment
- **⚠️ Privilege Escalation:** Containers with `--privileged` flag bypass isolation
- **⚠️ Host Access:** Mounted volumes can access host filesystem
- **🛡️ Best Practice:** Use non-root containers and verify image sources

```bash
# ✅ Safe operations
/docker ps
/docker logs myapp
/docker images

# ⚠️ High risk in privileged containers
/docker exec privileged-container "rm -rf /host/path"
```

### Database Backup Security
- **✅ Encrypted Transfer:** SSH encryption for remote backups
- **⚠️ Credential Exposure:** Passwords visible in command history
- **⚠️ Large Data Sets:** Backups can consume significant disk space
- **⚠️ Sensitive Data:** Backups contain potentially sensitive information
- **🛡️ Best Practice:** Use interactive password prompts, verify storage space

```bash
# ✅ Safe backup (password prompted interactively)
/db-backup mysql mydb root localhost

# ❌ Avoid visible passwords
/db-backup mysql mydb root mysecretpassword localhost

# ✅ Check space before large backups
# Run: df -h (check available space)
# Run: ls -la ~/banjin-backups/ (check existing backups)
```

### General Security Guidelines
1. **Test First:** Always test commands with non-critical data
2. **Verify Permissions:** Ensure proper access rights before operations
3. **Monitor Resources:** Watch system resources during long-running commands
4. **Clean Up:** Remove temporary files and old backups after use
5. **Use Secure Connections:** Always use SSH/VPN for remote access
6. **Audit Actions:** Review logs after sensitive operations

**Risk Level (1-10 scale):**
- `/upload`/`/download`: 3/10 (Low with proper validation)
- `/watch`: 4/10 (Depends on monitored command)
- `/tail`: 5/10 (May expose sensitive logs)
- `/docker`: 6/10 (Depends on container privileges)
- `/db-backup`: 7/10 (Handles sensitive data)

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

Banjin includes comprehensive server profiling and audit logging capabilities for sysadmins and developers. All data is stored locally—no automatic upload or sharing.

### Comprehensive Collection Strategy

Banjin collects detailed server information including:
- **Hardware**: CPU, cores, RAM, disk usage, network interfaces
- **OS & Kernel**: Full OS details, kernel version, uptime, load average
- **Services**: Running processes, systemd services, failed services
- **Security**: Firewall status, SSH configuration, failed login attempts
- **Network**: Listening ports, open connections, routing information
- **Performance**: Live CPU/memory usage, process counts, disk I/O
- **Audit Trail**: Complete log of all actions performed

Collection takes ~5-10 seconds and provides sysadmin-grade context for LLM analysis.

### Data Structures

**ServerProfile** (comprehensive server profile):
```typescript
{
  id: 'server-01',
  collectedAt: '2025-10-17T19:50:00Z',
  hardware: { cpu, cores, ram_gb, disk_gb, disks },
  os: { name, version, kernel, arch },
  users: [ { username, uid, shell, home } ],
  services: [ { name, status, port } ],
  network: {
    hostname,
    public_ip,
    interfaces: [ { name, ip, mac } ],
    listening_ports: [ { port, protocol, service } ],
    open_connections: number
  },
  security: {
    firewall_status: string,
    firewall_enabled: boolean,
    ssh_port: number,
    ssh_root_login: boolean,
    failed_services: string[]
  },
  performance: {
    cpu_usage_percent: number,
    memory_usage_percent: number,
    memory_used_gb: number,
    load_average: { one, five, fifteen },
    process_count: number
  },
  kernel_info: {
    kernel_version: string,
    boot_time: string
  },
  recent_alerts: {
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
- `/profile collect` – Collect comprehensive server profile with hardware, OS, services, security, and performance data
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

# Collect comprehensive server profile (with security & performance analysis)
/profile collect

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