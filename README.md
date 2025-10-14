# Banjin AI Assistant

Banjin is a CLI AI assistant that helps you with your daily tasks.

## Installation

### For End-Users (Recommended)

To install and use the application, run the following command:

```bash
npm install -g banjin
```

### For Developers (from Source)

If you want to contribute to the project, you can install it from the source code:

```bash
# 1. Clone the repository
git clone https://github.com/your-username/banjin.git

# 2. Navigate to the project directory
cd banjin

# 3. Install dependencies
npm install

# 4. To run the app locally for development
npm start

# 5. (Optional) To test the global command from your local code
npm install -g .
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

On the first run, Banjin will automatically prompt you to create a global configuration directory at `~/.banjin`.

This directory will be populated with the following files:

- `config.yaml`: The main configuration file. You **must** edit this file to add your LLM API key.
- `mcp-servers.json`: Configuration for MCP tools.
- `context.md`: A file for your global system context and instructions for the AI. You are encouraged to edit this file to customize the AI's behavior.

### Context File Updates

The `context.md` file that is created for you is based on a template from the application. If you update the application and the developers have provided an updated template, Banjin will detect this and ask you if you want to overwrite your local file with the new version. This allows you to get the latest improvements while still giving you control over your personal configuration.

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
