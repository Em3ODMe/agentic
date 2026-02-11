# Groq Provider

The Groq provider enables integration with [Groq AI](https://groq.com/) for high-performance LLM inference through the ModelRunner.

## Overview

The Groq provider supports various models including Llama and OpenAI models, providing fast inference capabilities. It supports JSON mode, tools, and streaming features.

## Supported Models

The following models are supported via the `GroqModelsList` type:

- `llama-3.1-8b-instant` - Llama 3.1 8B for instant responses
- `llama-3.3-70b-versatile` - Llama 3.3 70B for general purpose use
- `meta-llama/llama-guard-4-12b` - Llama Guard 4 for content moderation
- `openai/gpt-oss-120b` - OpenAI GPT-OSS 120B model
- `openai/gpt-oss-20b` - OpenAI GPT-OSS 20B model
- `whisper-large-v3` - Whisper Large v3 for speech recognition
- `whisper-large-v3-turbo` - Whisper Large v3 Turbo for faster speech processing

## Provider Capabilities

- **JSON Mode**: Structured JSON responses
- **Tools**: Function calling capabilities
- **Streaming**: Real-time response streaming

## Configuration

### Environment Variables

The Groq provider requires the `GROQ_API_KEY` environment variable:

```typescript
const environment = {
  GROQ_API_KEY: 'your-groq-api-key',
};
```

### Import

```typescript
import { ModelRunner, groqAIModel } from '@em3odme/agentic';
```

## Usage Examples

### Basic Usage

```typescript
const environment = {
  GROQ_API_KEY: process.env.GROQ_API_KEY!,
};

const modelRunner = new ModelRunner(environment);

// Use Llama 3.3 70B
const result = await modelRunner.run({
  messages: [{ role: 'user', content: 'Hello, how are you?' }],
  model: groqAIModel('llama-3.3-70b-versatile'),
});

console.log(result.content);
```

### JSON Mode Example

```typescript
const result = await modelRunner.run({
  messages: [{ role: 'user', content: 'List the top 3 programming languages' }],
  model: groqAIModel('llama-3.3-70b-versatile'),
  jsonMode: true,
});

// Response will be in JSON format
const languages = JSON.parse(result.content);
```

### Tools Example

```typescript
const result = await modelRunner.run({
  messages: [{ role: 'user', content: 'What is the weather in New York?' }],
  model: groqAIModel('llama-3.3-70b-versatile'),
  options: { tools: true },
});

// Function calls will be available in result.tool_calls
console.log(result.tool_calls);
```

### Whisper Speech Recognition Example

```typescript
// For audio transcription tasks
const result = await modelRunner.run({
  messages: [{ role: 'user', content: audioData }],
  model: groqAIModel('whisper-large-v3'),
});

console.log(result.content); // Transcribed text
```

## API Reference

### `groqAIModel(model: GroqModelsList): ModelRunnerConfig`

Creates a ModelRunner configuration for the specified Groq model.

**Parameters:**

- `model` - One of the supported `GroqModelsList` model identifiers

**Returns:**

- `ModelRunnerConfig` object with `provider: 'groq'` and the specified `model`

## Runtime Configuration

You can update runtime configuration for all providers including Groq:

```typescript
ModelRunner.updateRuntimeConfig({
  timeout: 60000, // 60 second timeout
  retries: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 10000,
  },
  caching: {
    enabled: true,
    ttl: 300000, // 5 minute cache
  },
  logging: {
    enabled: true,
    level: 'info',
  },
});
```

## Error Handling

The Groq provider implements comprehensive error handling through the `BaseModelProvider` abstract class. Errors are categorized and thrown with detailed context for debugging.

### Error Types

#### ConfigurationError

Thrown when required environment variables are missing.

```typescript
import { ConfigurationError } from '@em3odme/agentic';

// Constructor validates GROQ_API_KEY
try {
  const runner = new ModelRunner({}); // Missing GROQ_API_KEY
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error(error.message); // "Missing required environment variables: GROQ_API_KEY"
    console.error(error.provider); // "groq"
  }
}
```

#### ProviderError

Thrown for API and execution errors with status codes.

```typescript
import { ProviderError } from '@em3odme/agentic';

try {
  const result = await modelRunner.run({
    messages: [{ role: 'user', content: 'test' }],
    model: groqAIModel('llama-3.3-70b-versatile'),
  });
} catch (error) {
  if (error instanceof ProviderError) {
    console.error(error.message); // Error description
    console.error(error.provider); // "groq"
    console.error(error.statusCode); // HTTP status code (if applicable)
    console.error(error.originalError); // Original error object
  }
}
```

### Error Scenarios

#### 1. Missing Environment Variables

Thrown during `GroqProvider` instantiation:

```typescript
try {
  const runner = new ModelRunner({}); // Missing GROQ_API_KEY
} catch (error) {
  // ConfigurationError: Missing required environment variables: GROQ_API_KEY
}
```

#### 2. HTTP API Errors

Groq API errors include HTTP status codes and response text:

```typescript
try {
  const result = await modelRunner.run({
    messages: [{ role: 'user', content: 'test' }],
    model: groqAIModel('llama-3.3-70b-versatile'),
  });
} catch (error) {
  if (error instanceof ProviderError && error.statusCode) {
    // 401: Unauthorized - Invalid API key
    // 429: Rate limit exceeded
    // 500: Groq server error
    console.error(`Groq API Error (${error.statusCode})`);
  }
}
```

Error message format: `Groq API Error ({status}): {responseText}. Model: {modelName}`

#### 3. Execution Failures

Generic execution errors include the original error:

```typescript
try {
  const result = await modelRunner.run({
    messages: [{ role: 'user', content: 'test' }],
    model: groqAIModel('llama-3.3-70b-versatile'),
  });
} catch (error) {
  if (error instanceof ProviderError) {
    console.error(error.message); // "Groq execution failed: {error message}"
    console.error(error.originalError); // Original Error object
  }
}
```

#### 4. No Response After Retries

When all retry attempts fail:

```typescript
try {
  const result = await modelRunner.run({
    messages: [{ role: 'user', content: 'test' }],
    model: groqAIModel('llama-3.3-70b-versatile'),
  });
} catch (error) {
  // ProviderError: "Groq execution failed: No response from Groq API"
}
```

### Retry Mechanism

The Groq provider automatically retries failed requests with exponential backoff:

- **Max Retries**: 3 attempts
- **Base Delay**: 1000ms between retries
- **Retryable Errors**: Network failures, 5xx server errors

```typescript
// The makeRequest method uses runWithRetry
const response = await runWithRetry(
  async () => fetch(apiEndpoint, payload),
  3, // maxRetries
  1000 // baseDelay in ms
);
```

### Complete Error Handling Example

```typescript
import { ModelRunner, groqAIModel } from '@em3odme/agentic';
import type { ConfigurationError, ProviderError } from '@em3odme/agentic';

async function runWithGroq() {
  try {
    const environment = {
      GROQ_API_KEY: process.env.GROQ_API_KEY!,
    };

    const modelRunner = new ModelRunner(environment);

    const result = await modelRunner.run({
      messages: [{ role: 'user', content: 'Hello!' }],
      model: groqAIModel('llama-3.3-70b-versatile'),
    });

    return result.content;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error(`Configuration error: ${error.message}`);
      console.error(`Provider: ${error.provider}`);
      // Handle missing environment variables
    } else if (error instanceof ProviderError) {
      console.error(`Provider error: ${error.message}`);
      console.error(`Provider: ${error.provider}`);

      if (error.statusCode) {
        switch (error.statusCode) {
          case 401:
            console.error('Authentication failed - check API key');
            break;
          case 429:
            console.error('Rate limit exceeded - retry after delay');
            break;
          case 500:
          case 502:
          case 503:
            console.error('Groq service temporarily unavailable');
            break;
          default:
            console.error(`HTTP ${error.statusCode} error`);
        }
      }

      if (error.originalError) {
        console.error('Original error:', error.originalError);
      }
    } else {
      console.error('Unexpected error:', error);
    }

    throw error;
  }
}
```

## See Also

- [ModelRunner Documentation](./ModelRunner.md)
- [Groq API Documentation](https://console.groq.com/docs)
