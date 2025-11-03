import axios from 'axios';
import { AppState } from './config';
import { getToolDefinitions } from './tools';
import chalk from 'chalk';

const MAX_HISTORY_MESSAGES = 10;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 40000; // 40 seconds

/**
 * Detect LLM provider from baseUrl
 */
function detectLlmProvider(baseUrl: string): 'groq' | 'openrouter' | 'together' | 'generic' {
    const url = baseUrl.toLowerCase();
    if (url.includes('api.groq.com')) return 'groq';
    if (url.includes('openrouter.ai')) return 'openrouter';
    if (url.includes('api.together.ai')) return 'together';
    return 'generic';
}

/**
 * Build provider-specific headers for LLM API calls
 * Different providers require different headers (e.g., OpenRouter needs HTTP-Referer)
 */
function buildLlmHeaders(apiKey: string, baseUrl: string): Record<string, string> {
    const provider = detectLlmProvider(baseUrl);
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
    };

    // OpenRouter requires HTTP-Referer header (CRITICAL for 403 error fix)
    if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://banjin.local';
        headers['X-Title'] = 'Banjin CLI';
    }

    // Together.ai may need extra headers for rate limiting
    if (provider === 'together') {
        // Together typically uses standard OpenAI format
    }

    return headers;
}

/**
 * Validate and normalize model name for provider
 */
function normalizeModelName(model: string, baseUrl: string): string {
    const provider = detectLlmProvider(baseUrl);
    
    // OpenRouter requires 'provider/model' format, but check if already formatted
    if (provider === 'openrouter') {
        // If model doesn't contain '/', it might need 'openrouter/' prefix or provider prefix
        if (!model.includes('/')) {
            // Check if it's a common model that needs openrouter prefix
            if (model.includes('llama') || model.includes('mixtral') || model.includes('qwen')) {
                return `openrouter/${model}`;
            }
        }
    }
    
    return model;
}

export async function callLlmApi(state: AppState, onStatusUpdate?: (message: string) => void): Promise<any | null> {
    const { baseUrl: api_base, model, temperature, apiKey } = state.session_config.llm;
    const endpoint = `${api_base}/chat/completions`;
    const provider = detectLlmProvider(api_base);

    let messages_to_send = state.conversation;
    if (messages_to_send.length > MAX_HISTORY_MESSAGES) {
        messages_to_send = messages_to_send.slice(-MAX_HISTORY_MESSAGES);
    }

    const normalizedModel = normalizeModelName(model, api_base);
    
    const payload: any = {
        model: normalizedModel,
        messages: messages_to_send,
        temperature: temperature,
        tools: getToolDefinitions(state),
        tool_choice: "auto",
    };

    // OpenRouter specific payload adjustments
    if (provider === 'openrouter') {
        // OpenRouter accepts standard OpenAI format, no special payload changes needed
        // But you can add optional fields:
        payload.top_p = 0.95; // Optional: nucleus sampling
    }

    const headers = buildLlmHeaders(apiKey, api_base);

    let retries_left = MAX_RETRIES;
    let current_backoff_ms = INITIAL_BACKOFF_MS;

    while (retries_left > 0) {
        try {
            const response = await axios.post(endpoint, payload, { headers });
            const response_message = response.data.choices[0].message;
            state.conversation.push(response_message);
            return response_message;
        } catch (error: any) {
            // Handle 403 Forbidden - usually API key or header issue
            if (axios.isAxiosError(error) && error.response && error.response.status === 403) {
                const providerHint = provider === 'openrouter' 
                    ? 'OpenRouter requires: valid API key, proper HTTP-Referer header, and model name format. Check your API key and try using format: "provider/model"'
                    : `${provider} returned 403. Check your API key and configuration.`;
                return {
                    content: `Error calling LLM (403 Forbidden): ${providerHint}`
                };
            }
            // Handle 429 Rate limiting
            if (axios.isAxiosError(error) && error.response && error.response.status === 429) {
                const retryMessage = `Rate limit hit. Retrying in ${current_backoff_ms / 1000} seconds...`;
                if (onStatusUpdate) {
                    onStatusUpdate(retryMessage);
                }
                await new Promise(resolve => setTimeout(resolve, current_backoff_ms));
                current_backoff_ms *= 2; // Exponential backoff
                retries_left--;
            } else {
                // Log full error for debugging
                const errorDetails = axios.isAxiosError(error) && error.response 
                    ? `${error.response.status}: ${JSON.stringify(error.response.data)}`
                    : error.message;
                return {
                    content: `Error calling LLM: ${errorDetails}`
                };
            }
        }
    }
    return {
        content: `Error calling LLM: Max retries exceeded due to rate limiting.`
    };
}
