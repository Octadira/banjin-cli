# Banjin - The AI CLI Assistant for Developers & SysAdmins 🤖

**Banjin** is a powerful, extensible AI command-line assistant designed for developers, system administrators, and power users. It acts as an intelligent agent that can operate on your local machine or connect to remote servers via SSH, allowing you to perform complex tasks using natural language.

> *Banjin was crafted with the help of an AI assistant, making it an application by AI, for AI (and the humans who command them). 😉*

Think of it as a junior developer or sysadmin you can chat with, capable of executing commands, managing files, and integrating with external services, all while asking for your approval before taking any action.

## Core Features

-   **Remote Operations via SSH ☁️:** Securely connect to any server and instruct the AI to perform tasks, manage files, or run diagnostics directly on the remote machine.
-   **Intelligent Tool-Based Agent 🧠:** Banjin uses a Large Language Model (LLM) that can reason and decide which tools to use to accomplish your goals.
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

-   `config.yaml`: The main configuration file. **You must edit this file to add your LLM API key.**
-   `mcp-servers.json`: Configuration for your custom MCP tools.
-   `context.md`: A file for your global system context and instructions for the AI.
-   `ssh-servers.json`: A file to store your SSH server aliases and connection details.

**Security Note: 🛡️** Your `config.yaml` contains sensitive API keys. It is highly recommended to secure this file by setting its permissions to be readable only by you (e.g., `chmod 600 ~/.banjin/config.yaml`).

## LLM Compatibility 🤝

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

Banjin supports slash commands (e.g., `/help`) for direct instructions. You can also use a dot prefix (e.g., `.help`) to prevent the command from being sent to the LLM.

<details>
<summary>Click to view all commands</summary>

  **Chat & Context:**
  /context             - Display the current system context
  /resetchat           - Reset the current conversation memory
  /savechat            - Save the conversation to a file
  /loadchat <filename> - Load a conversation from a file
  /chats-list          - List saved chat files
  /chats-delete <file> - Delete a saved chat file

  **LLM & Model:**
  /model <model_name>  - Change the LLM model for this session
  /temp <0.0-2.0>      - Change the LLM temperature for this session
  /model-reset         - Reset model to the value from config file
  /temp-reset          - Reset temperature to the value from config file

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