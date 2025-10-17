type MinimalState = { session_config?: { cli?: { output_format?: string } } };

let markdownRender: null | ((text: string) => string) = null;
let markdownInitAttempted = false;

export async function ensureMarkdownRenderer(): Promise<void> {
  if (markdownInitAttempted || markdownRender) return;
  markdownInitAttempted = true;
  try {
    const markedMod: any = await import('marked');
    const terminalMod: any = await import('marked-terminal');
    const marked = (markedMod as any).marked || (markedMod as any).default || markedMod;
    const TerminalRenderer = (terminalMod as any).default || terminalMod;
    marked.setOptions({
      // @ts-ignore renderer is runtime option
      renderer: new TerminalRenderer({
        reflowText: true,
        width: process.stdout.columns || 100,
        tab: 2,
        emoji: true,
        showSectionPrefix: false,
      }),
    });
    markdownRender = (text: string) => (marked.parse ? marked.parse(text) : marked(text));
  } catch (_e) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const markedReq = require('marked');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const TerminalRendererReq = require('marked-terminal');
      const marked = (markedReq as any).marked || (markedReq as any).default || markedReq;
      const TerminalRenderer = (TerminalRendererReq as any).default || TerminalRendererReq;
      marked.setOptions({
        // @ts-ignore renderer is runtime option
        renderer: new TerminalRenderer({
          reflowText: true,
          width: process.stdout.columns || 100,
          tab: 2,
          emoji: true,
          showSectionPrefix: false,
        }),
      });
      markdownRender = (text: string) => (marked.parse ? marked.parse(text) : marked(text));
    } catch {
      markdownRender = null;
    }
  }
}

export function renderForTerminal(state: MinimalState, text: string): string {
  const preferred = state.session_config?.cli?.output_format || 'text';
  if (preferred !== 'markdown') return text;
  if (markdownRender) return markdownRender(text);
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const markedReq = require('marked');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const TerminalRendererReq = require('marked-terminal');
    const marked = (markedReq as any).marked || (markedReq as any).default || markedReq;
    const TerminalRenderer = (TerminalRendererReq as any).default || TerminalRendererReq;
    marked.setOptions({
      // @ts-ignore renderer is runtime option
      renderer: new TerminalRenderer({
        reflowText: true,
        width: process.stdout.columns || 100,
        tab: 2,
        emoji: true,
        showSectionPrefix: false,
      }),
    });
    markdownRender = (t: string) => (marked.parse ? marked.parse(t) : marked(t));
    return markdownRender(text);
  } catch {}
  return text;
}

export function isMarkdownRendererAvailable(): boolean {
  return !!markdownRender;
}
