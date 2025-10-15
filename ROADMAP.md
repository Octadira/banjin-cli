# Project Roadmap

This document outlines the future direction and high-level goals for the Banjin AI Assistant.

## 🎯 Guiding Principles

- **Empowerment:** Give developers and sysadmins powerful, AI-driven tools to enhance their productivity.
- **Safety:** Prioritize user safety with clear confirmations and predictable actions.
- **Extensibility:** Allow users to easily connect Banjin to their own scripts, tools, and APIs.

---

## 🚀 Future Features

### Short-Term (Next Major Version)

-   **Agent-like Capabilities (Auto-Pilot Mode):**
    -   **Goal:** Allow Banjin to handle multi-step tasks with a single user confirmation.
    -   **How it will work:** Instead of asking for approval for every single step, Banjin will first present a complete plan of action. The user will approve the entire plan, and Banjin will then execute it autonomously, reporting on its progress. This will be a major step towards turning Banjin into a true AI agent.

### Medium-Term

-   **Enhanced Tool Library:** Introduce more built-in tools for common tasks (e.g., Git operations, database queries).
-   **Improved Error Handling:** The agent will become better at understanding failures, retrying actions, or asking the user for help when it gets stuck.
-   **Context Chaining:** Allow the agent to "remember" the context of previous commands within the same session more effectively.

### Long-Term (Exploratory)

-   **IDE Integration (e.g., VS Code):** Bring the power of Banjin directly into your favorite editor. The vision is to create a lightweight extension that provides a rich chat UI and deep integration with the editor (e.g., editing code directly), all powered by the core `banjin` CLI running as a local server. This will offer a seamless, "just-works" experience while retaining the full power and configurability of the command-line tool.
-   **Enhanced TUI (Text-based User Interface):** Instead of a web-based GUI, explore evolving the interface into a more advanced TUI. This would keep Banjin in the terminal but provide richer, more interactive components for visualizing plans, managing connections, and browsing outputs, similar to tools like `htop` or `lazygit`.
-   **Team Collaboration Features:** Allow teams to share configurations, custom tools, and AI agents in a secure way.
-   **Deeper OS Integration:** Investigate deeper integration with the operating system for more powerful capabilities.

*This roadmap is subject to change. Community feedback and contributions are welcome!*