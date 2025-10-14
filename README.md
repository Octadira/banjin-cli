# Banjin AI Assistant

Banjin is a CLI AI assistant that helps you with your daily tasks.

## Installation

### Global Installation

```bash
npm install -g ./banjin
```

### Local Installation

```bash
npm install
```

## Usage

### Global

```bash
banjin
```

### Local

```bash
npm start
```

## Configuration

1.  Copy `config.example.yaml` to `.banjin/config.yaml`.
2.  Copy `mcp-servers.example.json` to `.banjin/mcp-servers.json`.
3.  Fill in your API key in `.banjin/config.yaml`.

## Commands

Banjin supports the following commands:

  Chat & Context:
  /context             - Display the current system context
  /resetchat           - Reset the current conversation memory
  /savechat            - Save the conversation to a file in the current project directory
  /loadchat <filename> - Load a conversation from a file in the current project directory
  /chats-list          - List saved chat files in the current project directory
  /chats-delete <file> - Delete a saved chat file from the current project directory

  LLM & Model:
  /model <model_name>  - Change the LLM model for this session
  /temp <0.0-2.0>      - Change the LLM temperature for this session
  /model-reset         - Reset model to the value from config file
  /temp-reset          - Reset temperature to the value from config file

  Connections & Files:
  /status              - Show current SSH connection status
  /connect <user@host> - Connect to a remote server via SSH [-i <key_path> | -p <pem_path>]
  /disconnect          - Disconnect from the remote server
  /ls-files [path]     - List files and directories in the specified path

  MCP Tools:
  /mcp-list            - List available MCP servers
  /mcp-reload          - Reload the MCP servers configuration

  General:
  /help                - Show this help message
  /clear               - Clear the screen
