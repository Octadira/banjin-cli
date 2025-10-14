# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-14

### Added
- Initial version of the Banjin AI Assistant.
- Core functionalities: chat with LLM, execute local commands, read/write files.
- SSH connectivity to remote servers.
- MCP tool integration with a generic, configuration-driven approach.
- Chat management features: save, load, list, and delete chats.
- Application can be installed globally and checks for updates.

### Changed
- Improved chat saving to use Markdown format with timestamped filenames.
- Reorganized help message for better readability.

### Fixed
- Fixed an issue where the application would hang when executing local MCP tools.
