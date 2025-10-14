import { run_command } from './tools';
import { AppState } from './config';

// Mock the AppState
const mockState: AppState = {
    ssh: { client: null, host_string: null },
    // other properties are not needed for this test
} as AppState;

describe('run_command', () => {
    it('should execute a simple local command successfully', async () => {
        const result = await run_command(mockState, { cmd: ['echo', 'hello'] });
        expect(result.trim()).toBe('hello');
    });

    it('should return an error for a failing command', async () => {
        // Using a command that is almost guaranteed to fail
        const result = await run_command(mockState, { cmd: ['a-command-that-does-not-exist'] });
        expect(result).toContain('Error executing local command');
    });

    it('should handle commands with arguments', async () => {
        const result = await run_command(mockState, { cmd: ['node', '-e', 'console.log("hello from node")'] });
        expect(result.trim()).toBe('hello from node');
    });
});