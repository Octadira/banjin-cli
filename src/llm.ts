import axios from 'axios';
import { AppState } from './config';
import { getToolDefinitions } from './tools';
import chalk from 'chalk';

const MAX_HISTORY_MESSAGES = 10;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 40000; // 40 seconds

export async function callLlmApi(state: AppState, onStatusUpdate?: (message: string) => void): Promise<any | null> {
    const { baseUrl: api_base, model, temperature, apiKey } = state.session_config.llm;
    const endpoint = `${api_base}/chat/completions`;

    let messages_to_send = state.conversation;
    if (messages_to_send.length > MAX_HISTORY_MESSAGES) {
        messages_to_send = messages_to_send.slice(-MAX_HISTORY_MESSAGES);
    }

    const payload: any = {
        model: model,
        messages: messages_to_send,
        temperature: temperature,
        tools: getToolDefinitions(state),
        tool_choice: "auto",
    };

    let retries_left = MAX_RETRIES;
    let current_backoff_ms = INITIAL_BACKOFF_MS;

    while (retries_left > 0) {
        try {
            const response = await axios.post(endpoint, payload, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            const response_message = response.data.choices[0].message;
            state.conversation.push(response_message);
            return response_message;
        } catch (error: any) {
            if (axios.isAxiosError(error) && error.response && error.response.status === 429) {
                const retryMessage = `Rate limit hit. Retrying in ${current_backoff_ms / 1000} seconds...`;
                if (onStatusUpdate) {
                    onStatusUpdate(retryMessage);
                }
                await new Promise(resolve => setTimeout(resolve, current_backoff_ms));
                current_backoff_ms *= 2; // Exponential backoff
                retries_left--;
            } else {
                return {
                    content: `Error calling LLM: ${error.message}`
                };
            }
        }
    }
    return {
        content: `Error calling LLM: Max retries exceeded due to rate limiting.`
    };
}
