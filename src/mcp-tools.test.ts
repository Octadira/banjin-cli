import { mcp_tool } from './mcp-tools';
import { AppState } from './config';

describe('mcp_tool', () => {
  it('should execute ddg-search without hanging', async () => {
    const mockState: Partial<AppState> = {
      mcp_servers: {
        mcpServers: {
          'ddg-search': {
            command: 'npx',
            args: ['-y', '@oevortex/ddg_search@latest'],
          },
        },
      },
    };

    const result = await mcp_tool(mockState as AppState, { 
      server_name: 'ddg-search', 
      query: 'test' 
    });

    console.log(result);
    expect(typeof result).toBe('string');
    expect(result).not.toContain('Error');
  }, 30000); // 30 second timeout for this test
});
