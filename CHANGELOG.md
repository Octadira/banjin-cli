# Changelog


All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0] - 2025-11-03

### Added
- **`/exec` command**: New command to execute local shell commands with output display and error handling
- **`/storage` command**: Implemented real functionality for storage statistics and pruning old files/audit logs
- **Backup cleanup**: Config files now automatically keep only the 5 most recent backups

### Changed
- **`/profile` command**: Simplified to always collect comprehensive full profiles (removed light/full modes)
- **Help text**: Removed "stub" mentions from `/profile` and `/audit` commands
- **Test coverage**: Increased from 83 to 98 passing tests

### Fixed
- Various bug fixes and improvements in command implementations

## [1.5.6] - 2025-10-17

### Added
- **Tool execution cancellation**: Press ESC during tool execution to cancel long-running or stuck operations.
- **Tool execution timeout**: New `cli.tool_timeout` configuration option (default 300 seconds, set to 0 to disable) prevents tools from hanging indefinitely.
- **Timeout management commands**:
  - `/timeout [seconds] [--save]` - View or set tool execution timeout with optional config persistence
  - `/timeout-reset` - Reset timeout to config default
  - Default timeout of 300 seconds (5 minutes) chosen for typical server administration tasks
- **Smart output handling**: Commands with excessive output (>50KB) are now handled intelligently with helpful suggestions for better commands instead of causing API errors.

### Changed
- Tool execution now shows "(press ESC to cancel)" hint for better user awareness.
- Config preservation now includes `cli.tool_timeout` during updates.

### Fixed
- **Terminal state bug**: Fixed issue where pressing ESC during tool execution left terminal in raw mode, preventing proper exit.
- **API 413 errors**: Commands producing massive output (e.g., `find /`) no longer cause payload too large errors. Instead, they return helpful guidance for writing better commands.
- **Exit behavior**: `/exit` command now properly cleans up terminal state and exits immediately without requiring Ctrl+C.

## [1.5.5] - 2025-10-17

### Fixed
- **Config preservation**: Config updates now preserve ALL user LLM settings (`apiKey`, `model`, `temperature`, `baseUrl`), not just `apiKey`. This was a regression introduced in v1.5.4.

## [1.5.4] - 2025-10-17

### Added
- **Output formatting commands**: New `/output [markdown|text] [--save]` command to toggle between plain text and Markdown rendering in the terminal.
- **Output format reset**: New `/output-reset` command to reset output format to config default.
- **Markdown rendering**: Integrated `marked` and `marked-terminal` for beautiful Markdown output in terminal (headings, lists, code blocks, tables, links).
- **CLI settings preservation**: Config updates now preserve both `cli.output_format` and `cli.input_mode` user preferences.
- Added `output_format` setting to `config.example.yaml` with documentation.

### Fixed
- **Editor mode bug**: Fixed issue where editor mode would submit messages even when closing without saving. Now treats no-save/no-change as cancel.
- **Test artifacts in package**: Excluded `src/test/**` from build output to keep published package clean.

### Changed
- **Default output format**: Changed default from `markdown` to `text` for maximum compatibility.
- **Dependency management**: Added `marked@11.2.0` and `marked-terminal@6.2.0` as dependencies (auto-install with package updates).
- **Code organization**: Extracted terminal rendering logic to separate `terminal-render.ts` module for better maintainability.
- Updated README with comprehensive output formatting documentation.

### Internal
- Added chalk mock for Jest to avoid ESM import issues in tests.
- Added TypeScript ambient declarations for marked packages.
- Improved test coverage for terminal rendering.

## [1.5.3] - 2025-10-17

### Added
- First-run setup now always creates ~/.banjin/config.yaml, mcp-servers.json, context.md, ssh-servers.json, with secure permissions.
- On every update/install, config.yaml is overwritten from template but preserves your apiKey automatically.
- On every update, context.md prompts for overwrite (with backup) if a new template is available.
- MCP debug: improved error reporting and diagnostics for MCP tool discovery failures.

### Fixed
- Regression: setup now triggers even if ~/.banjin exists but config.yaml is missing.
- Improved idempotency and safety of config file creation and update.

### Changed
- Internal: setup and update logic refactored for clarity and reliability.

### Removed
- Deleted the obsolete `mcp-tools.test.ts` file, which tested the old, non-functional MCP implementation.



## [1.5.0] - 2025-10-16

### Fixed

### Added
  - Added `/add-ssh` command to save connection profiles.
  - Added `/list-ssh` command to view all saved server aliases.
  - Added `/rm-ssh` command to delete a saved server profile.
  - Added `/mcp-tools` command to list all successfully discovered MCP tools, their system names, original names, and servers.
  - The application now explicitly lists which MCP servers were loaded successfully.

### Changed
## [1.3.9] - 2025-10-15

### Security
- Added `/.banjin/` to `.gitignore` to prevent accidental commits of local configuration, cache, or sensitive files.

## [1.3.8] - 2025-10-15

### Fixed
- Improved the update notifier's cache logic to prevent conflicts when multiple application versions are used on the same system.

## [1.3.7] - 2025-10-15

### Changed
- Significantly improved and rewrote the `README.md` to better clarify the application's core features, purpose, and usage, with a focus on its role as an AI assistant for server administration.

## [1.3.5] - 2025-10-14

### Changed
- Updated README.md with a list of compatible LLM models for tool use.

## [1.3.4] - 2025-10-14

### Fixed
- Applied manual bug fixes from user.

## [1.3.3] - 2025-10-14

### Fixed
- Improved the `/update` command to be interactive and fix terminal state issues after cancellation.

## [1.3.2] - 2025-10-14

### Fixed
- Corrected local context.md file detection to look directly in the current working directory.

## [1.3.1] - 2025-10-14

### Fixed
- Created `context.md` during initial setup.

## [1.3.0] - 2025-10-14

### Added
- Implemented a robust update mechanism with a new `/update` command.
- Added a non-blocking notification on startup if a new version is available.
- The application now displays a summary of active `context.md` files and MCP servers on startup.
- The application version is now displayed on startup.
- Implemented a check on startup to see if the user's global `context.md` differs from the app template, offering an update.

## [1.2.0] - 2025-10-14

### Added
- First-run automatic configuration setup to improve user experience.
- A default `context.md` file is now created in the user's config directory.

## [1.1.0] - 2025-10-14

### Added
- Implemented the `/loadchat` command to load conversations from Markdown files.

### Changed
- Reorganized the `/help` command output into logical categories for better readability.
- Chat logs are now saved in Markdown format (`.md`).
- Chat files are now saved with a timestamp in the filename (e.g., `chat_2025-10-14T10-30-00-000Z.md`).
- Chat operations (`/savechat`, `/chats-list`, `/chats-delete`) are now restricted to the project's `.banjin` directory.

## [1.0.0] - 2025-10-14

### Added
- Initial version of the Banjin AI Assistant.
- Core functionalities: chat with LLM, execute local commands, read/write files.
- SSH connectivity to remote servers.
- MCP tool integration with a generic, configuration-driven approach.