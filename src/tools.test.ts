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

describe('get_running_processes', () => {
    const mockState: AppState = {
        ssh: { client: null, host_string: null },
    } as AppState;

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should parse valid ps aux output correctly without a filter', async () => {
        const mockPsOutput = `
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.1 169592 11364 ?        Ss   Oct14   0:01 /sbin/init
node        1234  0.5  0.2 899292 85416 ?        Sl   10:30   0:05 /usr/bin/node /app/index.js
        `.trim();

        const runCommandSpy = jest.spyOn(tools, 'run_command').mockResolvedValue(mockPsOutput);

        const result = await tools.get_running_processes(mockState, {});
        const parsedResult = JSON.parse(result);

        expect(runCommandSpy).toHaveBeenCalledWith(mockState, { cmd: ['ps', 'aux'] });
        expect(parsedResult).toHaveLength(2);
        expect(parsedResult[1]).toEqual({
            user: 'node',
            pid: '1234',
            cpu_percent: '0.5',
            mem_percent: '0.2',
            vsz: '899292',
            rss: '85416',
            tty: '?',
            stat: 'Sl',
            start: '10:30',
            time: '0:05',
            command: '/usr/bin/node /app/index.js',
        });
    });

    it('should call grep when a filter is provided and filter out the grep process', async () => {
        const mockPsOutput = `
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
node        1234  0.5  0.2 899292 85416 ?        Sl   10:30   0:05 /usr/bin/node /app/index.js
user        5678  0.0  0.0  12345  1024 pts/0    S+   11:00   0:00 grep node
        `.trim();

        const runCommandSpy = jest.spyOn(tools, 'run_command').mockResolvedValue(mockPsOutput);

        const result = await tools.get_running_processes(mockState, { filter: 'node' });
        const parsedResult = JSON.parse(result);

        expect(runCommandSpy).toHaveBeenCalledWith(mockState, { cmd: ['sh', '-c', 'ps aux | grep node'] });
        expect(parsedResult).toHaveLength(1); // The grep process should be filtered out
        expect(parsedResult[0].pid).toBe('1234');
    });
});

describe('get_service_status', () => {
    const mockState: AppState = {
        ssh: { client: null, host_string: null },
    } as AppState;

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should parse an active and enabled service correctly', async () => {
        const mockStatusOutput = `
● nginx.service - A high performance web server and a reverse proxy server
     Loaded: loaded (/lib/systemd/system/nginx.service; enabled; vendor preset: enabled)
     Active: active (running) since Wed 2025-10-15 10:00:00 EEST; 5h 2min ago
   Main PID: 1234 (nginx)
        `.trim();
        
        const runCommandSpy = jest.spyOn(tools, 'run_command').mockResolvedValue(mockStatusOutput);
        const result = await tools.get_service_status(mockState, { service_name: 'nginx' });
        const parsedResult = JSON.parse(result);

        expect(parsedResult).toEqual({
            service: 'nginx',
            description: 'A high performance web server and a reverse proxy server',
            is_loaded: true,
            is_enabled: true,
            status: 'active',
            status_details: 'running',
            main_pid: '1234',
        });
    });

    it('should parse an inactive (dead) service correctly', async () => {
        const mockStatusOutput = `
● cron.service - Regular background program processing daemon
     Loaded: loaded (/lib/systemd/system/cron.service; enabled; vendor preset: enabled)
     Active: inactive (dead) since Tue 2025-10-14 18:00:00 EEST; 21h ago
   Main PID: 1500 (cron)
        `.trim();

        jest.spyOn(tools, 'run_command').mockResolvedValue(mockStatusOutput);
        const result = await tools.get_service_status(mockState, { service_name: 'cron' });
        const parsedResult = JSON.parse(result);

        expect(parsedResult.status).toBe('inactive');
        expect(parsedResult.status_details).toBe('dead');
        expect(parsedResult.is_enabled).toBe(true);
    });

    it('should handle a service that is not found', async () => {
        const mockStatusOutput = `Unit non-existent-service.service could not be found.`;
        jest.spyOn(tools, 'run_command').mockResolvedValue(mockStatusOutput);
        const result = await tools.get_service_status(mockState, { service_name: 'non-existent-service' });
        const parsedResult = JSON.parse(result);

        expect(parsedResult.status).toBe('unknown');
        expect(parsedResult.status_details).toContain('not found');
    });

    it('should handle non-systemd systems where the command fails', async () => {
        const mockStatusOutput = `sh: systemctl: command not found`;
        jest.spyOn(tools, 'run_command').mockResolvedValue(mockStatusOutput);
        const result = await tools.get_service_status(mockState, { service_name: 'docker' });
        const parsedResult = JSON.parse(result);

        expect(parsedResult.status).toBe('unknown');
        expect(parsedResult.status_details).toContain('systemctl command not found');
    });
});
