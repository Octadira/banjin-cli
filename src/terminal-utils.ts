/**
 * Terminal utility functions for managing stdin state
 */

/**
 * Global cleanup function to restore terminal to normal state
 * This fixes the bug where ESC leaves terminal in raw mode
 */
export function ensureTerminalCleanState() {
    try {
        // Remove all keypress listeners
        const listeners = process.stdin.listeners('keypress') as ((...args: any[]) => void)[];
        listeners.forEach(listener => {
            process.stdin.removeListener('keypress', listener);
        });
        
        // Restore normal mode
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
        }
    } catch (e) {
        // Ignore errors during cleanup
    }
}

