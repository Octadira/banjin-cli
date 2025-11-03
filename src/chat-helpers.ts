import { AppState } from './config';
import { findConfigPath } from './config';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export function saveChatToFile(state: AppState) {
    const projectPath = findConfigPath();
    if (!projectPath) {
        console.log(chalk.red('Error: Not in a valid .banjin project directory. Chat not saved.'));
        return;
    }

    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `chat_${timestamp}.md`;
        const filePath = path.join(projectPath, filename);

        let chatContent = '# Chat Log\n\n';
        for (const message of state.conversation) {
            const role = message.role;
            const content = message.content || `\`\`\`json\n${JSON.stringify(message.tool_calls, null, 2)}\n\`\`\``;
            chatContent += `## ${role.toUpperCase()}\n\n${content}\n\n`;
        }
        fs.writeFileSync(filePath, chatContent);
        console.log(chalk.green(`Conversation saved to ${filePath}`));
    } catch (error: any) {
        console.log(chalk.red(`Error saving chat: ${error.message}`));
    }
}

export function loadChatFromFile(state: AppState, filename: string) {
    const projectPath = findConfigPath();
    if (!projectPath) {
        console.log(chalk.red('Error: Not in a valid .banjin project directory.'));
        return;
    }

    try {
        const filePath = path.join(projectPath, filename);
        if (!fs.existsSync(filePath)) {
            console.log(chalk.red(`Error: File not found: ${filename}`));
            return;
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const newConversation: any[] = [];
        const sections = fileContent.split('## ').slice(1);

        for (const section of sections) {
            const lines = section.split('\n');
            const role = lines[0].trim().toLowerCase();
            let content = lines.slice(2).join('\n').trim();

            if (role === 'system') {
                continue;
            }

            if (content.startsWith('```json')) {
                content = content.substring(7, content.length - 3);
                newConversation.push({ role: role, tool_calls: JSON.parse(content) });
            } else {
                newConversation.push({ role: role, content: content });
            }
        }

        state.conversation = [state.conversation[0], ...newConversation];
        console.log(chalk.green(`Conversation loaded from ${filename}`));

    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.log(chalk.red(`Error loading chat: ${errorMessage}`));
    }
}

export function listSavedChats() {
    const projectPath = findConfigPath();
    if (!projectPath) {
        console.log(chalk.yellow('Not in a .banjin project directory. No chats to list.'));
        return;
    }

    try {
        const files = fs.readdirSync(projectPath).filter(file => file.startsWith('chat_') && file.endsWith('.md'));
        if (files.length === 0) {
            console.log(chalk.yellow('No saved chats found in this project.'));
        } else {
            console.log(chalk.yellow('Saved chats:\n') + files.map(f => `  - ${f}`).join('\n'));
        }
    } catch (error: any) {
        console.log(chalk.red(`Could not list chats: ${error.message}`));
    }
}

export function deleteChatFile(filename: string) {
    const projectPath = findConfigPath();
    if (!projectPath) {
        console.log(chalk.red('Error: Not in a valid .banjin project directory.'));
        return;
    }

    try {
        const filePath = path.join(projectPath, filename);
        if (!fs.existsSync(filePath)) {
            console.log(chalk.red(`Error: File not found: ${filename}`));
            return;
        }
        fs.unlinkSync(filePath);
        console.log(chalk.green(`Deleted file: ${filename}`));
    } catch (error: any) {
        console.log(chalk.red(`Could not delete file: ${error.message}`));
    }
}