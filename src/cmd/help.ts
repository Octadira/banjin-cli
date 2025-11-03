import { AppState } from '../config';
import chalk from 'chalk';

export async function handleHelp(_state: AppState, _args: string[]): Promise<boolean> {
    console.log(chalk.yellow(`
Available Commands:

  Chat & Context:
    /context             - Display the current system context
    /resetchat           - Reset the current conversation memory
    /savechat            - Save the conversation to a file
    /loadchat <filename> - Load a conversation from a file
    /chats-list          - List saved chat files
    /chats-delete <file> - Delete a saved chat file

   LLM & Model:
    /model <model_name>               - Change the LLM model for this session
    /temp <0.0-2.0>                   - Change the LLM temperature for this session
    /model-reset                      - Reset model to the value from config file
    /temp-reset                       - Reset temperature to the value from config file

  Interface:
    /mode <line|editor|multiline>     - Change the input mode for the current session
    /output [markdown|text] [--save]  - Show or set output format; use --save to persist to config
    /output-reset                     - Reset output format to default from config
    /timeout [seconds] [--save]       - Show or set tool execution timeout (0=disabled); use --save to persist
    /timeout-reset                    - Reset timeout to default from config

   Connections & Files:
    /status              - Show current SSH connection status
    /connect <alias|user@host> - Connect to a server via alias or direct connection
    /disconnect          - Disconnect from the remote server
    /ls-files [path]     - List files and directories
    /list-ssh            - List all saved SSH server aliases
    /add-ssh <alias> <user@host> [-i key_path] - Add or update a saved SSH server
    /rm-ssh <alias>      - Remove a saved SSH server

  MCP Tools:
    /mcp-list            - List available MCP servers from config
    /mcp-tools           - List all discovered tools from loaded MCP servers
    /mcp-reload          - Reload the MCP servers configuration

   General:
     /help                - Show this help message
     /clear               - Clear the screen
     /exec <command>      - Execute a local shell command
     /update              - Check for application updates

    Profiling & Audit:
        /profile <action>    - Server profiling operations (collect/show/summarize)
        /audit <action>      - Per-server audit log operations (show/tail/export)

    Storage (stubs):
        /storage <action>    - Storage stats and pruning (stats/prune) [stub only]
 `));
    return false;
}