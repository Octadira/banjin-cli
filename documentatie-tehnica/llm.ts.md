# llm.ts - LLM API Integration

## Overview
The `llm.ts` file handles all interactions with Large Language Model APIs, providing a unified interface for multiple LLM providers including Groq, OpenRouter, Together.ai, and generic OpenAI-compatible endpoints. It manages provider-specific configurations, error handling, and retry logic.

## Structure

### Constants
- **MAX_HISTORY_MESSAGES**: Limits conversation history to 10 messages for API efficiency
- **MAX_RETRIES**: Maximum retry attempts for failed requests (3)
- **INITIAL_BACKOFF_MS**: Initial backoff delay for rate limiting (40 seconds)

### Helper Functions
- **detectLlmProvider(baseUrl: string)**: Identifies provider based on API URL
- **buildLlmHeaders(apiKey: string, baseUrl: string)**: Constructs provider-specific HTTP headers
- **normalizeModelName(model: string, baseUrl: string)**: Formats model names for provider requirements

### Main Function
- **callLlmApi(state: AppState, onStatusUpdate?: callback)**: Makes API calls to LLM providers

## Functionality

### Provider Detection
Automatically detects LLM provider from base URL:
- **Groq**: api.groq.com
- **OpenRouter**: openrouter.ai  
- **Together.ai**: api.together.ai
- **Generic**: Fallback for other OpenAI-compatible APIs

### Provider-Specific Handling

#### Headers
- **Standard**: Content-Type and Authorization for all providers
- **OpenRouter**: Requires HTTP-Referer and X-Title headers to prevent 403 errors
- **Together.ai**: Uses standard OpenAI format

#### Model Normalization
- **OpenRouter**: Ensures models use "provider/model" format
- **Auto-prefixing**: Adds "openrouter/" prefix for common models when needed

#### Payload Adjustments
- **OpenRouter**: Adds optional top_p parameter for nucleus sampling
- **Standard Format**: Uses OpenAI chat completions format across all providers

### Error Handling & Retry Logic

#### HTTP Status Codes
- **403 Forbidden**: API key or header issues, returns descriptive error message
- **429 Rate Limiting**: Implements exponential backoff (40s → 80s → 160s)
- **Other Errors**: Returns detailed error information for debugging

#### Retry Mechanism
- Maximum 3 retry attempts for rate limiting
- Exponential backoff with status updates
- Graceful failure after max retries exceeded

### Conversation Management
- Limits message history to prevent token overflow
- Maintains conversation state by appending responses
- Preserves full conversation context for multi-turn interactions

## Integration Points

### With AppState
- Reads LLM configuration (baseUrl, model, temperature, apiKey)
- Updates conversation history with API responses
- Provides status updates during retry operations

### With Tools System
- Integrates tool definitions via `getToolDefinitions(state)`
- Enables function calling with `tool_choice: "auto"`
- Supports tool-augmented conversations

### With Main Application
- Called from `index.ts` during chat processing
- Optional status callback for user feedback during retries
- Returns structured response objects for further processing

## Design Patterns

### Strategy Pattern
- Provider-specific logic encapsulated in helper functions
- Easy extension for new LLM providers
- Consistent interface across different APIs

### Retry Pattern with Backoff
- Exponential backoff for rate limiting
- Configurable retry limits and delays
- Status updates during retry attempts

### Adapter Pattern
- Normalizes different provider APIs to common interface
- Handles provider-specific requirements transparently
- Maintains compatibility with OpenAI standard

## Best Practices

### Error Resilience
- Comprehensive error handling for common HTTP status codes
- Detailed error messages for debugging
- Graceful degradation on API failures

### Performance Optimization
- Conversation history limiting prevents token bloat
- Efficient retry logic minimizes unnecessary API calls
- Provider detection cached per request

### Security
- API keys handled securely through headers
- No logging of sensitive authentication data
- Provider-specific header requirements properly implemented

### Maintainability
- Modular helper functions for provider logic
- Clear separation of concerns (detection, headers, normalization)
- Easy to add support for new providers