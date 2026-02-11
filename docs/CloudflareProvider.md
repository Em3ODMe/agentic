# Cloudflare Provider

The Cloudflare provider enables integration with [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) for running AI models on Cloudflare's global edge network.

## Overview

The Cloudflare provider allows you to run various open-source AI models including Llama, DeepSeek, Mistral, and more, directly on Cloudflare's serverless GPU infrastructure. It supports JSON mode, tools, and provides fast inference at the edge.

## Supported Models

The following models are supported via the `AiModels` type from `@cloudflare/workers-types`:

- `@cf/meta/llama-3.3-70b-instruct-fp8-fast` - Llama 3.3 70B optimized for speed
- `@cf/meta/llama-3.1-8b-instruct-fast` - Llama 3.1 8B for fast responses
- `@cf/meta/llama-3.1-8b-instruct-fp8` - Llama 3.1 8B with fp8 quantization
- `@cf/meta/llama-4-scout-17b-16e-instruct` - Llama 4 Scout multimodal model
- `@cf/deepseek-ai/deepseek-r1-distill-qwen-32b` - DeepSeek R1 distilled model
- `@cf/mistral/mistral-7b-instruct-v0.1` - Mistral 7B instruction model
- `@hf/nousresearch/hermes-2-pro-mistral-7b` - Hermes 2 Pro with function calling
- `@cf/openai/gpt-oss-120b` - OpenAI GPT-OSS 120B model
- `@cf/openai/gpt-oss-20b` - OpenAI GPT-OSS 20B model
- `@cf/baai/bge-m3` - BGE-M3 embedding model
- `@cf/baai/bge-large-en-v1.5` - BGE large English embedding model

## Provider Capabilities

- **JSON Mode**: Structured JSON responses via `response_format: { type: 'json_object' }`
- **Tools**: Function calling capabilities
- **Streaming**: Not currently implemented
- **Retry Mechanism**: Automatic retries with exponential backoff (3 attempts)

## Configuration

### Environment Variables

The Cloudflare provider requires the `AI` environment variable, which is the Cloudflare Workers AI binding:

```typescript
const environment = {
  AI: env.AI, // Cloudflare Workers AI binding
};
```

> **Note**: Unlike other providers that use API keys, Cloudflare Workers AI uses a binding that is automatically available in Cloudflare Workers and Pages environments.

### Import

```typescript
import { ModelRunner, cloudflareAIModel } from '@em3odme/agentic';
```

## Usage Examples

### Basic Usage

```typescript
const environment = {
  AI: env.AI, // Cloudflare Workers AI binding
};

const modelRunner = new ModelRunner(environment);

// Use Llama 3.3 70B
const result = await modelRunner.run({
  messages: [{ role: 'user', content: 'Hello, how are you?' }],
  model: cloudflareAIModel('@cf/meta/llama-3.3-70b-instruct-fp8-fast'),
});

console.log(result.content);
```

### JSON Mode Example

```typescript
const result = await modelRunner.run({
  messages: [{ role: 'user', content: 'List the top 3 programming languages' }],
  model: cloudflareAIModel('@cf/meta/llama-3.3-70b-instruct-fp8-fast'),
  jsonMode: true,
});

// Response will be in JSON format
const languages = JSON.parse(result.content);
```

### Tools Example

```typescript
const result = await modelRunner.run({
  messages: [{ role: 'user', content: 'What is the weather in New York?' }],
  model: cloudflareAIModel('@hf/nousresearch/hermes-2-pro-mistral-7b'),
  options: { tools: true },
});

// Function calls will be available in result.tool_calls
console.log(result.tool_calls);
```

### Embedding Example

```typescript
// For text embedding tasks
const result = await modelRunner.run({
  messages: [{ role: 'user', content: 'Text to embed' }],
  model: cloudflareAIModel('@cf/baai/bge-m3'),
});

console.log(result.content); // Embedding vector as string
```

## API Reference

### `cloudflareAIModel(model: keyof AiModels): ModelRunnerConfig`

Creates a ModelRunner configuration for the specified Cloudflare AI model.

**Parameters:**

- `model` - One of the supported `AiModels` model identifiers (prefixed with `@cf/` or `@hf/`)

**Returns:**

- `ModelRunnerConfig` object with `provider: 'cloudflare'` and the specified `model`

## Runtime Configuration

You can update runtime configuration for all providers including Cloudflare:

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

The Cloudflare provider implements comprehensive error handling through the `BaseModelProvider` abstract class. Errors are categorized and thrown with detailed context for debugging.

### Error Types

#### ConfigurationError

Thrown when required environment variables are missing.

```typescript
import { ConfigurationError } from '@em3odme/agentic';

// Constructor validates AI binding
try {
  const runner = new ModelRunner({}); // Missing AI binding
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error(error.message); // "Missing required environment variables: AI"
    console.error(error.provider); // "cloudflare"
  }
}
```

#### ProviderError

Thrown for API and execution errors.

```typescript
import { ProviderError } from '@em3odme/agentic';

try {
  const result = await modelRunner.run({
    messages: [{ role: 'user', content: 'test' }],
    model: cloudflareAIModel('@cf/meta/llama-3.3-70b-instruct-fp8-fast'),
  });
} catch (error) {
  if (error instanceof ProviderError) {
    console.error(error.message); // Error description
    console.error(error.provider); // "cloudflare"
    console.error(error.originalError); // Original error object
  }
}
```

### Error Scenarios

#### 1. Missing AI Binding

Thrown during `CloudflareProvider` instantiation:

```typescript
try {
  const runner = new ModelRunner({}); // Missing AI binding
} catch (error) {
  // ConfigurationError: Missing required environment variables: AI
}
```

#### 2. Model Execution Errors

Cloudflare AI execution errors include the original error:

```typescript
try {
  const result = await modelRunner.run({
    messages: [{ role: 'user', content: 'test' }],
    model: cloudflareAIModel('@cf/meta/llama-3.3-70b-instruct-fp8-fast'),
  });
} catch (error) {
  if (error instanceof ProviderError) {
    // Error message format: "Cloudflare AI execution failed: {error message}"
    console.error(error.message);
    console.error(error.originalError); // Original Error object
  }
}
```

#### 3. Invalid Model Names

When an invalid model name is provided:

```typescript
try {
  const result = await modelRunner.run({
    messages: [{ role: 'user', content: 'test' }],
    model: cloudflareAIModel('invalid-model-name' as keyof AiModels),
  });
} catch (error) {
  // ProviderError: "Cloudflare AI execution failed: ..."
}
```

### Retry Mechanism

The Cloudflare provider automatically retries failed requests with exponential backoff:

- **Max Retries**: 3 attempts
- **Base Delay**: 1000ms between retries
- **Retryable Errors**: Network failures, temporary Cloudflare errors

```typescript
// The execute method uses runWithRetry
const response = await runWithRetry(
  async () => {
    return this.environment.AI!.run(model, payload);
  },
  3, // maxRetries
  1000 // baseDelay in ms
);
```

### Complete Error Handling Example

```typescript
import { ModelRunner, cloudflareAIModel } from '@em3odme/agentic';
import type { ConfigurationError, ProviderError } from '@em3odme/agentic';

async function runWithCloudflare() {
  try {
    const environment = {
      AI: env.AI, // Cloudflare Workers AI binding
    };

    const modelRunner = new ModelRunner(environment);

    const result = await modelRunner.run({
      messages: [{ role: 'user', content: 'Hello!' }],
      model: cloudflareAIModel('@cf/meta/llama-3.3-70b-instruct-fp8-fast'),
    });

    return result.content;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error(`Configuration error: ${error.message}`);
      console.error(`Provider: ${error.provider}`);
      // Handle missing AI binding
    } else if (error instanceof ProviderError) {
      console.error(`Provider error: ${error.message}`);
      console.error(`Provider: ${error.provider}`);

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

## Usage Notes

### Token Usage

Cloudflare Workers AI does not provide token usage data. The `usage` field in the response will always show:

```typescript
{
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0
}
```

### Response Format

The Cloudflare provider handles various response formats:

- **String responses**: Returned as-is
- **Object responses with `response` field**: Extracts the `response` property
- **Other formats**: JSON stringified

### Tool Calls

Currently, tool calls extraction returns an empty array as the implementation depends on the specific response format from Cloudflare AI models that support function calling.

## See Also

- [ModelRunner Documentation](./ModelRunner.md)
- [Cloudflare Workers AI Documentation](https://developers.cloudflare.com/workers-ai/)
- [Cloudflare Workers AI Models](https://developers.cloudflare.com/workers-ai/models/)
