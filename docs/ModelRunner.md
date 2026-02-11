# ModelRunner

The `ModelRunner` class is the core component for executing AI model requests across different providers. It provides a unified interface for running models with support for multiple providers, retry logic, JSON mode, and tool calling.

## Overview

`ModelRunner` abstracts the complexity of interacting with different AI providers (Cloudflare, Groq, etc.) by providing a consistent API. It handles:

- Provider-specific execution logic
- Input validation
- Capability checking (JSON mode, tools)
- Retry logic with exponential backoff
- Response building and formatting

## Constructor

```typescript
constructor(environment: ModelRunnerEnvironment)
```

Creates a new ModelRunner instance with the specified environment configuration.

**Parameters:**

- `environment`: The environment object containing provider-specific configurations (API keys, endpoints, etc.)

## Methods

### `run<T>(params)`

Executes a model request with the specified parameters.

```typescript
async run<T>({
  messages,
  model,
  jsonMode = false,
  options = {}
}: ModelRunnerRunParams): Promise<ModelRunnerResult<T>>
```

**Parameters:**

- `messages`: Array of message objects with `role` and `content` properties
- `model`: Object specifying `provider` (e.g., 'cloudflare', 'groq') and `model` name
- `jsonMode` (optional): Boolean to enable JSON response mode (default: `false`)
- `options` (optional): Additional provider-specific options including `tools`

**Returns:**

- `Promise<ModelRunnerResult<T>>`: Result object containing:
  - `content`: The model's response content
  - `isJson`: Whether the response is in JSON format
  - `tool_calls`: Array of tool calls (if any)
  - `raw`: Raw provider response
  - `usage`: Token usage statistics

**Example:**

```typescript
const runner = new ModelRunner({
  AI: { run: async (model, params) => ({ response: 'Hello!' }) },
  GROQ_API_KEY: 'your-api-key',
});

const result = await runner.run({
  messages: [{ role: 'user', content: 'Hello, how are you?' }],
  model: { provider: 'cloudflare', model: 'llama-2-7b' },
  jsonMode: false,
});

console.log(result.content); // 'Hello!'
```

### `getSupportedProviders()`

Returns a list of all supported provider names.

```typescript
static getSupportedProviders(): string[]
```

**Example:**

```typescript
const providers = ModelRunner.getSupportedProviders();
```

### `getProviderCapabilities(provider)`

Returns the capabilities of a specific provider.

```typescript
static getProviderCapabilities(provider: ModelRunnerProvider): {
  jsonMode: boolean;
  tools: boolean;
  streaming: boolean;
} | undefined
```

**Parameters:**

- `provider`: The provider name (e.g., 'cloudflare', 'groq')

**Returns:**

- Object containing capability flags, or `undefined` if provider not found

**Example:**

```typescript
const capabilities = ModelRunner.getProviderCapabilities('cloudflare');
// Returns: { jsonMode: true, tools: true, streaming: false }

const groqCapabilities = ModelRunner.getProviderCapabilities('groq');
// Returns: { jsonMode: true, tools: true, streaming: true }
```

### `updateRuntimeConfig(config)`

Updates the runtime configuration for retry logic, timeouts, caching, and logging.

```typescript
static updateRuntimeConfig(
  config: Partial<RuntimeConfig>
): void
```

**Parameters:**

- `config`: Partial configuration object with properties:
  - `timeout`: Request timeout in milliseconds
  - `retries`: Retry configuration (`maxAttempts`, `baseDelay`, `maxDelay`)
  - `caching`: Cache configuration (`enabled`, `ttl`)
  - `logging`: Logging configuration (`enabled`, `level`)

**Example:**

```typescript
// Update timeout
ModelRunner.updateRuntimeConfig({ timeout: 60000 });

// Update retry configuration
ModelRunner.updateRuntimeConfig({
  retries: { maxAttempts: 5, baseDelay: 1000, maxDelay: 10000 },
  logging: { enabled: true, level: 'debug' },
});
```

## Usage Examples

### Basic Text Generation

```typescript
import { ModelRunner } from '@em3odme/agentic';

const environment = {
  AI: {
    run: async (model, params) => ({
      response: 'I am doing well, thank you!',
    }),
  },
};

const runner = new ModelRunner(environment);

const result = await runner.run({
  messages: [{ role: 'user', content: 'How are you?' }],
  model: { provider: 'cloudflare', model: 'llama-2-7b' },
});

console.log(result.content); // 'I am doing well, thank you!'
```

### JSON Mode

```typescript
const result = await runner.run({
  messages: [{ role: 'user', content: 'Give me a JSON object with status' }],
  model: { provider: 'cloudflare', model: 'test-model' },
  jsonMode: true,
});

console.log(result.isJson); // true
console.log(result.content); // Parsed JSON content
```

### With Tools

```typescript
const result = await runner.run({
  messages: [{ role: 'user', content: 'What is the weather?' }],
  model: { provider: 'cloudflare', model: 'test-model' },
  options: { tools: true },
});

console.log(result.tool_calls); // Array of tool calls
```

### Error Handling

```typescript
try {
  const result = await runner.run({
    messages: [{ role: 'user', content: 'test' }],
    model: { provider: 'cloudflare', model: 'test-model' },
  });
} catch (error) {
  console.error('Model execution failed:', error.message);
}
```

## Provider Capabilities

| Provider   | JSON Mode | Tools | Streaming |
| ---------- | --------- | ----- | --------- |
| cloudflare | ✓         | ✓     | ✗         |
| groq       | ✓         | ✓     | ✓         |

## Validation

The `ModelRunner` performs automatic validation:

1. **Input Validation**: Validates provider, model, and options before execution
2. **Capability Validation**: Ensures the provider supports requested features (JSON mode, tools)
3. **Environment Validation**: Verifies required environment variables are present

If validation fails, a `ConfigurationError` is thrown with descriptive messages.

## Retry Logic

The `ModelRunner` includes built-in retry logic with exponential backoff. By default:

- Maximum attempts: 3
- Base delay: 1000ms
- Maximum delay: 10000ms

Configure via `updateRuntimeConfig()`.

## Types

### ModelRunnerRunParams

```typescript
interface ModelRunnerRunParams {
  messages: Array<{ role: string; content: string }>;
  model: { provider: ModelRunnerProvider; model: string };
  jsonMode?: boolean;
  options?: Record<string, unknown>;
}
```

### ModelRunnerResult<T>

```typescript
interface ModelRunnerResult<T> {
  content: T;
  isJson: boolean;
  tool_calls: unknown[];
  raw: unknown;
  usage?: unknown;
}
```
