# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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