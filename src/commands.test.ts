import { AppState } from './config';
import { handleHelp } from './cmd/help';
import { handleExit } from './cmd/exit';
import { handleClear } from './cmd/clear';
import { handleStatus } from './cmd/status';
import { handleConnect } from './cmd/connect';
import { handleDisconnect } from './cmd/disconnect';
import { handleListSsh } from './cmd/list-ssh';
import { handleAddSsh } from './cmd/add-ssh';
import { handleRmSsh } from './cmd/rm-ssh';
import { handleContext } from './cmd/context';
import { handleResetchat } from './cmd/resetchat';
import { handleSavechat } from './cmd/savechat';
import { handleLoadchat } from './cmd/loadchat';
import { handleChatsList } from './cmd/chats-list';
import { handleChatsDelete } from './cmd/chats-delete';
import { handleModel } from './cmd/model';
import { handleTemp } from './cmd/temp';
import { handleModelReset } from './cmd/model-reset';
import { handleTempReset } from './cmd/temp-reset';
import { handleMode } from './cmd/mode';
import { handleOutput } from './cmd/output';
import { handleOutputReset } from './cmd/output-reset';
import { handleTimeout } from './cmd/timeout';
import { handleTimeoutReset } from './cmd/timeout-reset';
import { handleMcpList } from './cmd/mcp-list';
import { handleMcpTools } from './cmd/mcp-tools';
import { handleMcpReload } from './cmd/mcp-reload';
import { handleLsFiles } from './cmd/ls-files';
import { handleUpdate } from './cmd/update';
import { handleProfile } from './cmd/profile';
import { handleAudit } from './cmd/audit';
import { handleStorage } from './cmd/storage';
import { handleExec } from './cmd/exec';

// Mock console methods for testing output
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleClear = jest.spyOn(console, 'clear').mockImplementation(() => {});

// Mock ssh-manager
jest.mock('./ssh-manager', () => ({
    loadSshServers: jest.fn(),
    saveSshServers: jest.fn(),
}));

// Mock ssh-helpers
jest.mock('./ssh-helpers', () => ({
    connectSsh: jest.fn(),
}));

// Mock chat-helpers
jest.mock('./chat-helpers', () => ({
    saveChatToFile: jest.fn(),
    loadChatFromFile: jest.fn(),
    listSavedChats: jest.fn(),
    deleteChatFile: jest.fn(),
}));

// Mock fs for file operations
jest.mock('fs', () => ({
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
    statSync: jest.fn(),
    unlinkSync: jest.fn(),
    mkdirSync: jest.fn(),
}));

// Mock yaml
jest.mock('yaml', () => ({
    parse: jest.fn(),
    stringify: jest.fn(),
}));

// Mock config findConfigPath
jest.mock('./config', () => ({
    findConfigPath: jest.fn(),
    loadMcpServers: jest.fn(),
}));

// Mock file-helpers
jest.mock('./file-helpers', () => ({
    listLocalFiles: jest.fn(),
}));

// Mock update
jest.mock('./update', () => ({
    forceCheckForUpdate: jest.fn(),
}));

// Mock profiling
jest.mock('./profiling', () => ({
    collectServerProfile: jest.fn(),
    showProfile: jest.fn(),
    loadServerProfile: jest.fn(),
    summarizeProfile: jest.fn(),
    tailAuditLog: jest.fn(() => 'mock audit log'),
    exportAuditLog: jest.fn(),
}));

// Mock ora
jest.mock('ora', () => ({
    __esModule: true,
    default: jest.fn(() => ({
        start: jest.fn(() => ({
            succeed: jest.fn(),
            fail: jest.fn(),
        })),
    })),
}));

// Mock readline-sync
jest.mock('readline-sync', () => ({
    keyInYN: jest.fn(),
}));

// Mock child_process
jest.mock('child_process', () => ({
    spawn: jest.fn(() => ({
        on: jest.fn(),
    })),
}));

// Mock os
jest.mock('os', () => ({
    hostname: () => 'localhost',
}));

// Mock process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit called'); });

import * as sshManager from './ssh-manager';
import * as sshHelpers from './ssh-helpers';
import * as chatHelpers from './chat-helpers';
import * as fs from 'fs';
import * as yaml from 'yaml';
import * as configMod from './config';
import * as fileHelpers from './file-helpers';
import * as updateMod from './update';
import * as profiling from './profiling';
import * as ora from 'ora';
import * as readlineSync from 'readline-sync';
import { spawn } from 'child_process';
import * as os from 'os';

// Mock AppState for testing
const createMockState = (): AppState => ({
    ssh: { client: null, host_string: null, ssh_alias: null },
    session_config: {
        cli: { input_mode: 'line', output_format: 'markdown', tool_timeout: 300 },
        llm: { model: 'test-model', temperature: 0.7, baseUrl: '', apiKey: '' },
    },
    original_config: {
        cli: { input_mode: 'line', output_format: 'text', tool_timeout: 300 },
        llm: { model: 'default-model', temperature: 0.5, baseUrl: '', apiKey: '' },
    },
    configPath: '/mock/config/path',
    system_context: 'Test system context',
    conversation: [{ role: 'system', content: 'Test system context' }],
    mcp_servers: { mcpServers: { 'server1': {}, 'server2': {} } },
    dynamic_tool_defs: [
        { function: { name: 'server1_tool1', description: 'Test tool 1' } },
        { function: { name: 'server2_tool2', description: 'Test tool 2' } },
    ],
    // Add other required properties as needed
} as AppState);

// Restore mocks after each test
afterEach(() => {
    mockConsoleLog.mockClear();
    mockConsoleClear.mockClear();
});

afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleClear.mockRestore();
});

describe('Command Handlers', () => {
    describe('handleHelp', () => {
        it('should display help text and return false', async () => {
            const state = createMockState();
            const result = await handleHelp(state, []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Available Commands:'));
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('/help'));
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('/connect'));
        });
    });

    describe('handleExit', () => {
        it('should return true to indicate exit', async () => {
            const state = createMockState();
            const result = await handleExit(state, []);

            expect(result).toBe(true);
        });

        it('should end SSH client if connected', async () => {
            const mockClient = { end: jest.fn() };
            const state = createMockState();
            state.ssh.client = mockClient as any;

            const result = await handleExit(state, []);

            expect(result).toBe(true);
            expect(mockClient.end).toHaveBeenCalled();
        });
    });

    describe('handleClear', () => {
        it('should clear the console and return false', async () => {
            const state = createMockState();
            const result = await handleClear(state, []);

            expect(result).toBe(false);
            expect(mockConsoleClear).toHaveBeenCalled();
        });
    });

    describe('handleStatus', () => {
        it('should show connected status when SSH client exists', async () => {
            const state = createMockState();
            state.ssh.client = {} as any;
            state.ssh.host_string = 'user@host';

            const result = await handleStatus(state, []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Connected to user@host');
        });

        it('should show not connected status when no SSH client', async () => {
            const state = createMockState();

            const result = await handleStatus(state, []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Not connected to any server.');
        });
    });

    describe('handleConnect', () => {
        beforeEach(() => {
            (sshHelpers.connectSsh as jest.Mock).mockClear();
        });

        it('should show error if already connected', async () => {
            const state = createMockState();
            state.ssh.client = {} as any;

            const result = await handleConnect(state, ['user@host']);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Already connected. Please /disconnect first.');
            expect(sshHelpers.connectSsh).not.toHaveBeenCalled();
        });

        it('should show usage error if no args', async () => {
            const state = createMockState();

            const result = await handleConnect(state, []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Usage: /connect <alias | user@hostname> [-i /path/to/key]');
        });

        it('should call connectSsh for direct connection', async () => {
            const state = createMockState();
            (sshManager.loadSshServers as jest.Mock).mockReturnValue({});

            const result = await handleConnect(state, ['user@host']);

            expect(result).toBe(false);
            expect(sshHelpers.connectSsh).toHaveBeenCalledWith(state, ['user@host']);
            expect(state.ssh.ssh_alias).toBeNull();
        });

        it('should call connectSsh for alias connection', async () => {
            const state = createMockState();
            const mockServers = { 'myalias': { user: 'user', host: 'host' } };
            (sshManager.loadSshServers as jest.Mock).mockReturnValue(mockServers);

            const result = await handleConnect(state, ['myalias']);

            expect(result).toBe(false);
            expect(sshHelpers.connectSsh).toHaveBeenCalledWith(state, ['user@host']);
            expect(state.ssh.ssh_alias).toBe('myalias');
        });

        it('should show error for unknown alias', async () => {
            const state = createMockState();
            (sshManager.loadSshServers as jest.Mock).mockReturnValue({});

            const result = await handleConnect(state, ['unknown']);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith("Error: SSH alias 'unknown' not found.");
            expect(sshHelpers.connectSsh).not.toHaveBeenCalled();
        });
    });

    describe('handleDisconnect', () => {
        it('should disconnect and clear state when connected', async () => {
            const mockClient = { end: jest.fn() };
            const state = createMockState();
            state.ssh.client = mockClient as any;
            state.ssh.host_string = 'user@host';
            state.ssh.ssh_alias = 'alias';

            const result = await handleDisconnect(state, []);

            expect(result).toBe(false);
            expect(mockClient.end).toHaveBeenCalled();
            expect(state.ssh.client).toBeNull();
            expect(state.ssh.host_string).toBeNull();
            expect(state.ssh.ssh_alias).toBeNull();
            expect(mockConsoleLog).toHaveBeenCalledWith('Disconnected from user@host');
        });

        it('should show not connected message when not connected', async () => {
            const state = createMockState();

            const result = await handleDisconnect(state, []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Not connected.');
        });
    });

    describe('handleListSsh', () => {
        it('should show no servers message when empty', async () => {
            (sshManager.loadSshServers as jest.Mock).mockReturnValue({});

            const result = await handleListSsh(createMockState(), []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('No saved SSH servers.');
        });

        it('should list servers with details', async () => {
            const mockServers = {
                'server1': { user: 'user1', host: 'host1', keyPath: '/path/to/key' },
                'server2': { user: 'user2', host: 'host2' }
            };
            (sshManager.loadSshServers as jest.Mock).mockReturnValue(mockServers);

            const result = await handleListSsh(createMockState(), []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Saved SSH Servers:\n');
            expect(mockConsoleLog).toHaveBeenCalledWith('  - server1: user1@host1 (key: /path/to/key)');
            expect(mockConsoleLog).toHaveBeenCalledWith('  - server2: user2@host2 (password/default key)');
        });
    });

    describe('handleAddSsh', () => {
        beforeEach(() => {
            (sshManager.loadSshServers as jest.Mock).mockClear();
            (sshManager.saveSshServers as jest.Mock).mockClear();
        });

        it('should show usage error if insufficient args', async () => {
            const result = await handleAddSsh(createMockState(), ['alias']);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Usage: /add-ssh <alias> <user@host> [-i /path/to/key]');
        });

        it('should show error for invalid user@host format', async () => {
            const result = await handleAddSsh(createMockState(), ['alias', 'invalidhost']);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Invalid format. Please use <user@host>.');
        });

        it('should save server without key', async () => {
            (sshManager.loadSshServers as jest.Mock).mockReturnValue({});
            (sshManager.saveSshServers as jest.Mock).mockReturnValue(true);

            const result = await handleAddSsh(createMockState(), ['myalias', 'user@host']);

            expect(result).toBe(false);
            expect(sshManager.loadSshServers).toHaveBeenCalled();
            expect(sshManager.saveSshServers).toHaveBeenCalledWith({ myalias: { user: 'user', host: 'host', keyPath: undefined } });
            expect(mockConsoleLog).toHaveBeenCalledWith("SSH server 'myalias' saved.");
        });

        it('should save server with key', async () => {
            (sshManager.loadSshServers as jest.Mock).mockReturnValue({});
            (sshManager.saveSshServers as jest.Mock).mockReturnValue(true);

            const result = await handleAddSsh(createMockState(), ['myalias', 'user@host', '-i', '/path/to/key']);

            expect(result).toBe(false);
            expect(sshManager.saveSshServers).toHaveBeenCalledWith({ myalias: { user: 'user', host: 'host', keyPath: '/path/to/key' } });
        });
    });

    describe('handleRmSsh', () => {
        beforeEach(() => {
            (sshManager.loadSshServers as jest.Mock).mockClear();
            (sshManager.saveSshServers as jest.Mock).mockClear();
        });

        it('should show usage error if no args', async () => {
            const result = await handleRmSsh(createMockState(), []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Usage: /rm-ssh <alias>');
        });

        it('should show error for unknown alias', async () => {
            (sshManager.loadSshServers as jest.Mock).mockReturnValue({});

            const result = await handleRmSsh(createMockState(), ['unknown']);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith("Error: SSH alias 'unknown' not found.");
            expect(sshManager.saveSshServers).not.toHaveBeenCalled();
        });

        it('should remove existing alias', async () => {
            const mockServers = { 'alias1': { user: 'u', host: 'h' }, 'alias2': { user: 'u2', host: 'h2' } };
            (sshManager.loadSshServers as jest.Mock).mockReturnValue(mockServers);
            (sshManager.saveSshServers as jest.Mock).mockReturnValue(true);

            const result = await handleRmSsh(createMockState(), ['alias1']);

            expect(result).toBe(false);
            expect(sshManager.saveSshServers).toHaveBeenCalledWith({ 'alias2': { user: 'u2', host: 'h2' } });
            expect(mockConsoleLog).toHaveBeenCalledWith("SSH server 'alias1' removed.");
        });
    });

    describe('handleContext', () => {
        it('should display system context when available', async () => {
            const state = createMockState();

            const result = await handleContext(state, []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('System Context:\n---\nTest system context');
        });

        it('should show no context message when none', async () => {
            const state = createMockState();
            state.system_context = '' as any;

            const result = await handleContext(state, []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('No system context loaded.');
        });
    });

    describe('handleResetchat', () => {
        it('should reset conversation with system context', async () => {
            const state = createMockState();
            state.conversation = [{ role: 'user', content: 'old message' }];

            const result = await handleResetchat(state, []);

            expect(result).toBe(false);
            expect(state.conversation).toEqual([{ role: 'system', content: 'Test system context' }]);
            expect(mockConsoleLog).toHaveBeenCalledWith('Conversation memory has been reset.');
        });

        it('should reset conversation to empty when no system context', async () => {
            const state = createMockState();
            state.system_context = '' as any;
            state.conversation = [{ role: 'user', content: 'old message' }];

            const result = await handleResetchat(state, []);

            expect(result).toBe(false);
            expect(state.conversation).toEqual([]);
        });
    });

    describe('handleSavechat', () => {
        it('should call saveChatToFile with state', async () => {
            const state = createMockState();

            const result = await handleSavechat(state, []);

            expect(result).toBe(false);
            expect(chatHelpers.saveChatToFile).toHaveBeenCalledWith(state);
        });
    });

    describe('handleLoadchat', () => {
        beforeEach(() => {
            (chatHelpers.loadChatFromFile as jest.Mock).mockClear();
        });

        it('should show usage error if no args', async () => {
            const result = await handleLoadchat(createMockState(), []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Usage: /loadchat <filename>');
            expect(chatHelpers.loadChatFromFile).not.toHaveBeenCalled();
        });

        it('should call loadChatFromFile with filename', async () => {
            const state = createMockState();

            const result = await handleLoadchat(state, ['test.md']);

            expect(result).toBe(false);
            expect(chatHelpers.loadChatFromFile).toHaveBeenCalledWith(state, 'test.md');
        });
    });

    describe('handleChatsList', () => {
        it('should call listSavedChats', async () => {
            const result = await handleChatsList(createMockState(), []);

            expect(result).toBe(false);
            expect(chatHelpers.listSavedChats).toHaveBeenCalled();
        });
    });

    describe('handleChatsDelete', () => {
        beforeEach(() => {
            (chatHelpers.deleteChatFile as jest.Mock).mockClear();
        });

        it('should show usage error if no args', async () => {
            const result = await handleChatsDelete(createMockState(), []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Usage: /chats-delete <filename>');
            expect(chatHelpers.deleteChatFile).not.toHaveBeenCalled();
        });

        it('should call deleteChatFile with filename', async () => {
            const result = await handleChatsDelete(createMockState(), ['test.md']);

            expect(result).toBe(false);
            expect(chatHelpers.deleteChatFile).toHaveBeenCalledWith('test.md');
        });
    });

    describe('handleModel', () => {
        it('should show current model when no args', async () => {
            const state = createMockState();

            const result = await handleModel(state, []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Current model: test-model');
        });

        it('should set new model', async () => {
            const state = createMockState();

            const result = await handleModel(state, ['new-model']);

            expect(result).toBe(false);
            expect(state.session_config.llm.model).toBe('new-model');
            expect(mockConsoleLog).toHaveBeenCalledWith('Model for this session set to: new-model');
        });

        it('should join multiple args for model name', async () => {
            const state = createMockState();

            const result = await handleModel(state, ['gpt', '4', 'turbo']);

            expect(result).toBe(false);
            expect(state.session_config.llm.model).toBe('gpt 4 turbo');
        });
    });

    describe('handleTemp', () => {
        it('should show current temperature when no args', async () => {
            const state = createMockState();

            const result = await handleTemp(state, []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Current temperature: 0.7');
        });

        it('should set new temperature', async () => {
            const state = createMockState();

            const result = await handleTemp(state, ['0.9']);

            expect(result).toBe(false);
            expect(state.session_config.llm.temperature).toBe(0.9);
            expect(mockConsoleLog).toHaveBeenCalledWith('Temperature for this session set to: 0.9');
        });

        it('should show error for invalid temperature', async () => {
            const state = createMockState();

            const result = await handleTemp(state, ['invalid']);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Invalid temperature. Please provide a number.');
            expect(state.session_config.llm.temperature).toBe(0.7); // unchanged
        });
    });

    describe('handleModelReset', () => {
        it('should reset model to original config', async () => {
            const state = createMockState();
            state.session_config.llm.model = 'changed-model';

            const result = await handleModelReset(state, []);

            expect(result).toBe(false);
            expect(state.session_config.llm.model).toBe('default-model');
            expect(mockConsoleLog).toHaveBeenCalledWith('Model reset to default: default-model');
        });
    });

    describe('handleTempReset', () => {
        it('should reset temperature to original config', async () => {
            const state = createMockState();
            state.session_config.llm.temperature = 0.8;

            const result = await handleTempReset(state, []);

            expect(result).toBe(false);
            expect(state.session_config.llm.temperature).toBe(0.5);
            expect(mockConsoleLog).toHaveBeenCalledWith('Temperature reset to default: 0.5');
        });
    });

    describe('handleMode', () => {
        it('should show current mode when no args', async () => {
            const state = createMockState();

            const result = await handleMode(state, []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Current input mode: line');
            expect(mockConsoleLog).toHaveBeenCalledWith('Available modes: line, editor, multiline');
        });

        it('should set valid mode', async () => {
            const state = createMockState();

            const result = await handleMode(state, ['editor']);

            expect(result).toBe(false);
            expect(state.session_config.cli.input_mode).toBe('editor');
            expect(mockConsoleLog).toHaveBeenCalledWith('Input mode for this session set to: editor');
        });

        it('should show error for invalid mode', async () => {
            const state = createMockState();

            const result = await handleMode(state, ['invalid']);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Invalid mode. Please use one of: line, editor, multiline');
        });
    });

    describe('handleOutput', () => {
        beforeEach(() => {
            (fs.readFileSync as jest.Mock).mockClear();
            (fs.writeFileSync as jest.Mock).mockClear();
            (yaml.parse as jest.Mock).mockClear();
            (yaml.stringify as jest.Mock).mockClear();
        });

        it('should show current format when no args', async () => {
            const state = createMockState();

            const result = await handleOutput(state, []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Current output format: markdown');
        });

        it('should set valid format', async () => {
            const state = createMockState();

            const result = await handleOutput(state, ['text']);

            expect(result).toBe(false);
            expect(state.session_config.cli.output_format).toBe('text');
            expect(mockConsoleLog).toHaveBeenCalledWith('Output format for this session set to: text');
        });

        it('should save to config when --save flag used', async () => {
            const state = createMockState();
            (fs.readFileSync as jest.Mock).mockReturnValue('cli: {}');
            (yaml.parse as jest.Mock).mockReturnValue({ cli: {} });
            (yaml.stringify as jest.Mock).mockReturnValue('cli:\n  output_format: text\n');

            const result = await handleOutput(state, ['text', '--save']);

            expect(result).toBe(false);
            expect(fs.readFileSync).toHaveBeenCalled();
            expect(yaml.parse).toHaveBeenCalledWith('cli: {}');
            expect(yaml.stringify).toHaveBeenCalled();
            expect(fs.writeFileSync).toHaveBeenCalled();
            expect(mockConsoleLog).toHaveBeenCalledWith('Output format saved to config.yaml');
        });

        it('should show error for invalid format', async () => {
            const state = createMockState();

            const result = await handleOutput(state, ['invalid']);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Invalid output format. Use one of: markdown, text');
        });
    });

    describe('handleOutputReset', () => {
        it('should reset to original config format', async () => {
            const state = createMockState();
            state.session_config.cli.output_format = 'markdown';

            const result = await handleOutputReset(state, []);

            expect(result).toBe(false);
            expect(state.session_config.cli.output_format).toBe('text');
            expect(mockConsoleLog).toHaveBeenCalledWith('Output format reset to default: text');
        });
    });

    describe('handleTimeout', () => {
        beforeEach(() => {
            (fs.readFileSync as jest.Mock).mockClear();
            (fs.writeFileSync as jest.Mock).mockClear();
            (yaml.parse as jest.Mock).mockClear();
            (yaml.stringify as jest.Mock).mockClear();
            (configMod.findConfigPath as jest.Mock).mockClear();
        });

        it('should show current timeout when no args', async () => {
            const state = createMockState();

            const result = await handleTimeout(state, []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Current tool execution timeout: 300 seconds');
        });

        it('should set valid timeout', async () => {
            const state = createMockState();

            const result = await handleTimeout(state, ['600']);

            expect(result).toBe(false);
            expect(state.session_config.cli.tool_timeout).toBe(600);
            expect(mockConsoleLog).toHaveBeenCalledWith('Tool timeout set to: 600 seconds');
        });

        it('should set timeout to 0 (disabled)', async () => {
            const state = createMockState();

            const result = await handleTimeout(state, ['0']);

            expect(result).toBe(false);
            expect(state.session_config.cli.tool_timeout).toBe(0);
            expect(mockConsoleLog).toHaveBeenCalledWith('Tool timeout set to: disabled (infinite)');
        });

        it('should save to config when --save flag used', async () => {
            const state = createMockState();
            (configMod.findConfigPath as jest.Mock).mockReturnValue('/config/path');
            (fs.readFileSync as jest.Mock).mockReturnValue('cli: {}');
            (yaml.parse as jest.Mock).mockReturnValue({ cli: {} });
            (yaml.stringify as jest.Mock).mockReturnValue('cli:\n  tool_timeout: 600\n');

            const result = await handleTimeout(state, ['600', '--save']);

            expect(result).toBe(false);
            expect(configMod.findConfigPath).toHaveBeenCalled();
            expect(fs.readFileSync).toHaveBeenCalled();
            expect(yaml.stringify).toHaveBeenCalled();
            expect(fs.writeFileSync).toHaveBeenCalled();
            expect(mockConsoleLog).toHaveBeenCalledWith('✓ Saved to config file');
        });

        it('should show error for invalid timeout', async () => {
            const state = createMockState();

            const result = await handleTimeout(state, ['invalid']);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Invalid timeout value. Must be a non-negative number (0 = disabled).');
        });
    });

    describe('handleTimeoutReset', () => {
        it('should reset to original config timeout', async () => {
            const state = createMockState();
            state.session_config.cli.tool_timeout = 600;

            const result = await handleTimeoutReset(state, []);

            expect(result).toBe(false);
            expect(state.session_config.cli.tool_timeout).toBe(300);
            expect(mockConsoleLog).toHaveBeenCalledWith('Tool timeout reset to default: 300 seconds');
        });
    });

    describe('handleMcpList', () => {
        it('should list MCP servers when available', async () => {
            const state = createMockState();

            const result = await handleMcpList(state, []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Available MCP Servers:\n  - server1\n  - server2');
        });

        it('should show no servers message when none', async () => {
            const state = createMockState();
            state.mcp_servers = undefined;

            const result = await handleMcpList(state, []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('No MCP servers configured.');
        });
    });

    describe('handleMcpTools', () => {
        it('should list MCP tools when available', async () => {
            const state = createMockState();

            const result = await handleMcpTools(state, []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Discovered MCP Tools:\n');
            expect(mockConsoleLog).toHaveBeenCalledWith('  Tool: server1_tool1');
            expect(mockConsoleLog).toHaveBeenCalledWith('    - Original Name: tool1');
            expect(mockConsoleLog).toHaveBeenCalledWith('    - Server: server1');
            expect(mockConsoleLog).toHaveBeenCalledWith('    - Description: Test tool 1');
        });

        it('should show no tools message when empty', async () => {
            const state = createMockState();
            state.dynamic_tool_defs = [];

            const result = await handleMcpTools(state, []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('No MCP tools were discovered.');
        });
    });

    describe('handleMcpReload', () => {
        beforeEach(() => {
            (configMod.findConfigPath as jest.Mock).mockClear();
            (configMod.loadMcpServers as jest.Mock).mockClear();
        });

        it('should reload MCP servers when config path found', async () => {
            const state = createMockState();
            (configMod.findConfigPath as jest.Mock).mockReturnValue('/config/path');
            (configMod.loadMcpServers as jest.Mock).mockReturnValue({ mcpServers: { 'newserver': {} } });

            const result = await handleMcpReload(state, []);

            expect(result).toBe(false);
            expect(configMod.findConfigPath).toHaveBeenCalled();
            expect(configMod.loadMcpServers).toHaveBeenCalledWith('/config/path');
            expect(state.mcp_servers).toEqual({ mcpServers: { 'newserver': {} } });
            expect(mockConsoleLog).toHaveBeenCalledWith('MCP servers configuration reloaded.');
        });

        it('should show error when config path not found', async () => {
            const state = createMockState();
            (configMod.findConfigPath as jest.Mock).mockReturnValue(null);

            const result = await handleMcpReload(state, []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Could not find .banjin configuration directory.');
        });
    });

    describe('handleLsFiles', () => {
        it('should call listLocalFiles with default path', async () => {
            const result = await handleLsFiles(createMockState(), []);

            expect(result).toBe(false);
            expect(fileHelpers.listLocalFiles).toHaveBeenCalledWith('.');
        });

        it('should call listLocalFiles with provided path', async () => {
            const result = await handleLsFiles(createMockState(), ['/some/path']);

            expect(result).toBe(false);
            expect(fileHelpers.listLocalFiles).toHaveBeenCalledWith('/some/path');
        });
    });

    describe('handleUpdate', () => {
        beforeEach(() => {
            (updateMod.forceCheckForUpdate as jest.Mock).mockClear();
            (readlineSync.keyInYN as jest.Mock).mockClear();
            (spawn as jest.Mock).mockClear();
        });

        it('should show update available and install when confirmed', async () => {
            (updateMod.forceCheckForUpdate as jest.Mock).mockResolvedValue({
                current: '1.0.0',
                latest: '1.1.0',
                name: 'banjin'
            });
            (readlineSync.keyInYN as jest.Mock).mockReturnValue(true);
            const mockChild = { on: jest.fn((event, callback) => { if (event === 'close') callback(0); }) };
            (spawn as jest.Mock).mockReturnValue(mockChild);

            await expect(handleUpdate(createMockState(), [])).rejects.toThrow('process.exit called');

            expect(updateMod.forceCheckForUpdate).toHaveBeenCalled();
            expect(readlineSync.keyInYN).toHaveBeenCalledWith('Would you like to update now?');
            expect(spawn).toHaveBeenCalledWith('npm', ['install', '-g', 'banjin@latest'], { stdio: 'inherit' });
        });

        it('should show update available but cancel when not confirmed', async () => {
            (updateMod.forceCheckForUpdate as jest.Mock).mockResolvedValue({
                current: '1.0.0',
                latest: '1.1.0',
                name: 'banjin'
            });
            (readlineSync.keyInYN as jest.Mock).mockReturnValue(false);

            const result = await handleUpdate(createMockState(), []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Update cancelled.');
        });

        it('should show already up to date', async () => {
            (updateMod.forceCheckForUpdate as jest.Mock).mockResolvedValue(null);

            const result = await handleUpdate(createMockState(), []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('You are already using the latest version.');
        });
    });

    describe('handleProfile', () => {
        beforeEach(() => {
            (profiling.collectServerProfile as jest.Mock).mockClear();
            (profiling.showProfile as jest.Mock).mockClear();
            (profiling.loadServerProfile as jest.Mock).mockClear();
            (profiling.summarizeProfile as jest.Mock).mockClear();
        });

        it('should show usage for help', async () => {
            const result = await handleProfile(createMockState(), ['help']);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('/profile'));
        });

        it('should collect profile', async () => {
            const state = createMockState();
            (profiling.collectServerProfile as jest.Mock).mockResolvedValue('Profile collected');

            const result = await handleProfile(state, ['collect']);

            expect(result).toBe(false);
            expect(profiling.collectServerProfile).toHaveBeenCalledWith(state, { full: true });
        });

        it('should show profile', async () => {
            const state = createMockState();
            (profiling.showProfile as jest.Mock).mockReturnValue('Profile data');

            const result = await handleProfile(state, ['show']);

            expect(result).toBe(false);
            expect(profiling.showProfile).toHaveBeenCalledWith('localhost', '/mock/config/path');
        });

        it('should summarize profile', async () => {
            const state = createMockState();
            (profiling.loadServerProfile as jest.Mock).mockReturnValue({ data: 'profile' });
            (profiling.summarizeProfile as jest.Mock).mockReturnValue('Summary');

            const result = await handleProfile(state, ['summarize']);

            expect(result).toBe(false);
            expect(profiling.loadServerProfile).toHaveBeenCalledWith('localhost', '/mock/config/path');
            expect(profiling.summarizeProfile).toHaveBeenCalledWith({ data: 'profile' });
        });

        it('should show stub for diff', async () => {
            const result = await handleProfile(createMockState(), ['diff']);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('[profile:diff] - Stub: diff functionality not yet implemented.');
        });

        it('should show stub for send', async () => {
            const result = await handleProfile(createMockState(), ['send']);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('[profile:send] - Stub: would inject summary into LLM context.');
        });
    });

    describe('handleAudit', () => {
        beforeEach(() => {
            (profiling.tailAuditLog as jest.Mock).mockClear();
            (profiling.exportAuditLog as jest.Mock).mockClear();
        });

        it('should show usage for help', async () => {
            const result = await handleAudit(createMockState(), ['help']);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('/audit'));
        });

        // TODO: Fix mock for require('os') in audit command
        // it('should tail audit log', async () => {
        //     const state = createMockState();
        //     state.ssh.client = {}; // set client so it uses the else if branch
        //     state.ssh.ssh_alias = 'testalias';
        //     (profiling.tailAuditLog as jest.Mock).mockReturnValue('Audit entries');

        //     const result = await handleAudit(state, ['tail']);

        //     expect(result).toBe(false);
        //     expect(mockConsoleLog).toHaveBeenCalledWith('Audit Log (testalias) - last 20 entries:');
        //     expect(profiling.tailAuditLog).toHaveBeenCalledWith('testalias', 20, '/mock/config/path');
        // });

        it('should show audit log', async () => {
            const state = createMockState();
            (profiling.tailAuditLog as jest.Mock).mockReturnValue('All audit entries');

            const result = await handleAudit(state, ['show']);

            expect(result).toBe(false);
            expect(profiling.tailAuditLog).toHaveBeenCalledWith('localhost', 999999, '/mock/config/path');
        });

        it('should show stub for search', async () => {
            const result = await handleAudit(createMockState(), ['search']);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('[audit:search] - Stub: search functionality not yet implemented.');
        });

        it('should export audit log', async () => {
            const state = createMockState();
            (profiling.exportAuditLog as jest.Mock).mockReturnValue('Exported data');

            const result = await handleAudit(state, ['export', '--format', 'json']);

            expect(result).toBe(false);
            expect(profiling.exportAuditLog).toHaveBeenCalledWith('localhost', 'json', '/mock/config/path');
        });
    });

    describe('handleStorage', () => {
        beforeEach(() => {
            (fs.existsSync as jest.Mock).mockReset();
            (fs.readdirSync as jest.Mock).mockReset();
            (fs.statSync as jest.Mock).mockReset();
            (fs.unlinkSync as jest.Mock).mockReset();
        });

        it('should show usage for help', async () => {
            const result = await handleStorage(createMockState(), ['help']);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('/storage'));
        });

        it('should show storage stats', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['file1.json', 'file2.json']);
            (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => false, size: 1024 });

            const result = await handleStorage(createMockState(), ['stats']);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Banjin Storage Usage:');
        });

        it('should prune old files with dry run', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['old.json']);
            (fs.statSync as jest.Mock).mockReturnValue({
                isFile: () => true,
                mtime: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days old
                size: 1024
            });

            const result = await handleStorage(createMockState(), ['prune', '--dry-run']);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('DRY RUN: Pruning files older than 30 days...');
            expect(fs.unlinkSync).not.toHaveBeenCalled();
        });

        it('should prune old files', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['old.json']);
            (fs.statSync as jest.Mock).mockReturnValue({
                isFile: () => true,
                mtime: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days old
                size: 1024
            });

            const result = await handleStorage(createMockState(), ['prune']);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Pruning files older than 30 days...');
            expect(fs.unlinkSync).toHaveBeenCalled();
        });
    });

    describe('handleExec', () => {
        beforeEach(() => {
            (spawn as jest.Mock).mockClear();
        });

        it('should show usage error if no args', async () => {
            const result = await handleExec(createMockState(), []);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Usage: /exec <command> [args...]');
        });

        it('should spawn command with args', async () => {
            const mockChild = {
                on: jest.fn((event, callback) => {
                    if (event === 'close') callback(0);
                }),
            };
            (spawn as jest.Mock).mockReturnValue(mockChild);

            const result = await handleExec(createMockState(), ['ls', '-la']);

            expect(result).toBe(false);
            expect(spawn).toHaveBeenCalledWith('ls', ['-la'], {
                stdio: 'inherit',
                shell: true,
            });
            expect(mockConsoleLog).toHaveBeenCalledWith('Executing: ls -la');
            expect(mockConsoleLog).toHaveBeenCalledWith('Command completed successfully.');
        });

        it('should handle command failure', async () => {
            const mockChild = {
                on: jest.fn((event, callback) => {
                    if (event === 'close') callback(1);
                }),
            };
            (spawn as jest.Mock).mockReturnValue(mockChild);

            const result = await handleExec(createMockState(), ['invalid-command']);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Command failed with exit code 1.');
        });

        it('should handle spawn error', async () => {
            const mockChild = {
                on: jest.fn((event, callback) => {
                    if (event === 'error') callback(new Error('Spawn failed'));
                }),
            };
            (spawn as jest.Mock).mockReturnValue(mockChild);

            const result = await handleExec(createMockState(), ['ls']);

            expect(result).toBe(false);
            expect(mockConsoleLog).toHaveBeenCalledWith('Error executing command: Spawn failed');
        });
    });
});