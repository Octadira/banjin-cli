import * as tools from './tools';
import { AppState } from './config';

// Mock the AppState
const mockState: AppState = {
    ssh: { client: null, host_string: null },
    // other properties are not needed for this test
} as AppState;

describe('run_command', () => {
    it('should execute a simple local command successfully', async () => {
        const result = await tools.run_command(mockState, { cmd: ['echo', 'hello'] });
        expect(result.trim()).toBe('hello');
    });

    it('should return an error for a failing command', async () => {
        // Using a command that is almost guaranteed to fail
        const result = await tools.run_command(mockState, { cmd: ['a-command-that-does-not-exist'] });
        expect(result).toContain('Error executing local command');
    });

    it('should handle commands with arguments', async () => {
        const result = await tools.run_command(mockState, { cmd: ['node', '-e', 'console.log("hello from node")'] });
        expect(result.trim()).toBe('hello from node');
    });
});

describe('get_disk_usage', () => {
    const mockState: AppState = {
        ssh: { client: null, host_string: null },
    } as AppState;

    // Restore all mocks after each test
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should parse valid df output correctly', async () => {
        const mockDfOutput = `
Filesystem      Size  Used Avail Use% Mounted on
udev            3.9G     0  3.9G   0% /dev
tmpfs           788M  1.7M  786M   1% /run
/dev/sda1       110G   50G   55G  48% /
        `.trim();

        // Spy on run_command within the same module
        const runCommandSpy = jest.spyOn(tools, 'run_command').mockResolvedValue(mockDfOutput);

        const result = await tools.get_disk_usage(mockState, {});
        const parsedResult = JSON.parse(result);

        expect(runCommandSpy).toHaveBeenCalledWith(mockState, { cmd: ['df', '-h', '-P'] });
        expect(parsedResult).toHaveLength(3);
        expect(parsedResult[2]).toEqual({
            filesystem: '/dev/sda1',
            size: '110G',
            used: '50G',
            available: '55G',
            use_percent: '48%',
            mounted_on: '/',
        });
    });

    it('should return an error if run_command fails', async () => {
        const errorMessage = 'Error: df command failed';
        const runCommandSpy = jest.spyOn(tools, 'run_command').mockResolvedValue(errorMessage);

        const result = await tools.get_disk_usage(mockState, {});

        expect(result).toBe(errorMessage);
    });
});
