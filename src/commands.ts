import { AppState } from './config';

// Import command handlers
import { handleExit } from './cmd/exit';
import { handleHelp } from './cmd/help';
import { handleClear } from './cmd/clear';
import { handleContext } from './cmd/context';
import { handleStatus } from './cmd/status';
import { handleConnect } from './cmd/connect';
import { handleDisconnect } from './cmd/disconnect';
import { handleListSsh } from './cmd/list-ssh';
import { handleAddSsh } from './cmd/add-ssh';
import { handleRmSsh } from './cmd/rm-ssh';
import { handleResetchat } from './cmd/resetchat';
import { handleSavechat } from './cmd/savechat';
import { handleLoadchat } from './cmd/loadchat';
import { handleModel } from './cmd/model';
import { handleTemp } from './cmd/temp';
import { handleMode } from './cmd/mode';
import { handleOutput } from './cmd/output';
import { handleOutputReset } from './cmd/output-reset';
import { handleModelReset } from './cmd/model-reset';
import { handleTempReset } from './cmd/temp-reset';
import { handleTimeout } from './cmd/timeout';
import { handleTimeoutReset } from './cmd/timeout-reset';
import { handleChatsList } from './cmd/chats-list';
import { handleChatsDelete } from './cmd/chats-delete';
import { handleLsFiles } from './cmd/ls-files';
import { handleMcpList } from './cmd/mcp-list';
import { handleMcpTools } from './cmd/mcp-tools';
import { handleMcpReload } from './cmd/mcp-reload';
import { handleUpdate } from './cmd/update';
import { handleProfile } from './cmd/profile';
import { handleAudit } from './cmd/audit';
import { handleStorage } from './cmd/storage';
import { handleExec } from './cmd/exec';

export async function handleSlashCommand(state: AppState, input: string): Promise<boolean> {
    const parts = input.trim().split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    switch (command) {
        case '/exit':
            return await handleExit(state, args);
        case '/help':
            return await handleHelp(state, args);
        case '/clear':
            return await handleClear(state, args);
        case '/context':
            return await handleContext(state, args);
        case '/status':
            return await handleStatus(state, args);
        case '/connect':
            return await handleConnect(state, args);
        case '/disconnect':
            return await handleDisconnect(state, args);
        case '/list-ssh':
            return await handleListSsh(state, args);
        case '/add-ssh':
            return await handleAddSsh(state, args);
        case '/rm-ssh':
            return await handleRmSsh(state, args);
        case '/resetchat':
            return await handleResetchat(state, args);
        case '/savechat':
            return await handleSavechat(state, args);
        case '/loadchat':
            return await handleLoadchat(state, args);
        case '/model':
            return await handleModel(state, args);
        case '/temp':
            return await handleTemp(state, args);
        case '/mode':
            return await handleMode(state, args);
        case '/output':
        case '/output-format':
            return await handleOutput(state, args);
        case '/output-reset':
            return await handleOutputReset(state, args);
        case '/model-reset':
            return await handleModelReset(state, args);
        case '/temp-reset':
            return await handleTempReset(state, args);
        case '/timeout':
            return await handleTimeout(state, args);
        case '/timeout-reset':
            return await handleTimeoutReset(state, args);
        case '/chats-list':
            return await handleChatsList(state, args);
        case '/chats-delete':
            return await handleChatsDelete(state, args);
        case '/ls-files':
            return await handleLsFiles(state, args);
        case '/mcp-list':
            return await handleMcpList(state, args);
        case '/mcp-tools':
            return await handleMcpTools(state, args);
        case '/mcp-reload':
            return await handleMcpReload(state, args);
        case '/update':
            return await handleUpdate(state, args);
        case '/profile':
            return await handleProfile(state, args);
        case '/audit':
            return await handleAudit(state, args);
        case '/storage':
            return await handleStorage(state, args);
        case '/exec':
            return await handleExec(state, args);
        default:
            console.log(`Unknown command: ${command}`);
            return false;
    }
}

