# Agentic

A TypeScript library for running AI models across multiple providers with a unified interface.

## Overview

Agentic provides a simple, consistent API for interacting with various AI providers including Cloudflare Workers AI and Groq. It handles provider-specific execution logic, retry logic with exponential backoff, JSON mode, tool calling, and response formatting.

## Installation

```bash
npm install @em3odme/agentic
pnpm install @em3odme/agentic
yarn add @em3odme/agentic
```

**Requirements:** Node.js >= 18.0.0

## Quick Start

```typescript
import { ModelRunner, groqAIModel } from '@em3odme/agentic';

const runner = new ModelRunner({
  GROQ_API_KEY: process.env.GROQ_API_KEY!,
});

const result = await runner.run({
  messages: [{ role: 'user', content: 'Hello, how are you?' }],
  model: groqAIModel('llama-3.3-70b-versatile'),
});

console.log(result.content);
```

## Supported Providers

| Provider                                              | JSON Mode | Tools | Streaming | Setup          |
| ----------------------------------------------------- | --------- | ----- | --------- | -------------- |
| [Cloudflare Workers AI](./docs/CloudflareProvider.md) | ✓         | ✓     | ✗         | `AI` binding   |
| [Groq](./docs/GroqProvider.md)                        | ✓         | ✓     | ✓         | `GROQ_API_KEY` |

### Cloudflare Workers AI

Run open-source models (Llama, DeepSeek, Mistral, etc.) on Cloudflare's global edge network.

```typescript
import { ModelRunner, cloudflareAIModel } from '@em3odme/agentic';

const runner = new ModelRunner({ AI: env.AI });

const result = await runner.run({
  messages: [{ role: 'user', content: 'Hello!' }],
  model: cloudflareAIModel('@cf/meta/llama-3.3-70b-instruct-fp8-fast'),
});
```

**Features:**

- Serverless GPU infrastructure
- JSON mode for structured responses
- Function calling capabilities
- Embedding models support
- Automatic retries with exponential backoff

### Groq

High-performance LLM inference with ultra-low latency.

```typescript
import { ModelRunner, groqAIModel } from '@em3odme/agentic';

const runner = new ModelRunner({
  GROQ_API_KEY: process.env.GROQ_API_KEY!,
});

const result = await runner.run({
  messages: [{ role: 'user', content: 'Hello!' }],
  model: groqAIModel('llama-3.3-70b-versatile'),
});
```

**Features:**

- Real-time streaming responses
- JSON mode for structured outputs
- Tool/function calling
- Speech recognition (Whisper models)
- Ultra-fast inference

## Usage Examples

### JSON Mode

```typescript
const result = await runner.run({
  messages: [{ role: 'user', content: 'List top 3 programming languages' }],
  model: groqAIModel('llama-3.3-70b-versatile'),
  jsonMode: true,
});

const languages = JSON.parse(result.content);
```

### Tool Calling

```typescript
const result = await runner.run({
  messages: [{ role: 'user', content: 'What is the weather in New York?' }],
  model: groqAIModel('llama-3.3-70b-versatile'),
  options: { tools: true },
});

console.log(result.tool_calls);
```

### Runtime Configuration

```typescript
ModelRunner.updateRuntimeConfig({
  timeout: 60000,
  retries: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 10000,
  },
});
```

## Documentation

For detailed documentation, see:

- [ModelRunner Documentation](./docs/ModelRunner.md) - Core API reference
- [Cloudflare Provider](./docs/CloudflareProvider.md) - Cloudflare Workers AI setup and usage
- [Groq Provider](./docs/GroqProvider.md) - Groq API setup and usage

## Package Info

- **Repository:** https://github.com/Em3ODMe/agentic.git
- **Issues:** https://github.com/Em3ODMe/agentic/issues

## Keywords

agent, llm, ai, typescript, nodejs
