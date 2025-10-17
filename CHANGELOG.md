# Changelog


All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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