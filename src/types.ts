export type AgentRole = 'system' | 'user' | 'assistant';
export interface AgentMessage {
  role: AgentRole;
  content: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export type ModelRunnerProvider = 'cloudflare' | 'groq';

export type ModelRunnerConfig = {
  provider: ModelRunnerProvider;
  model: string;
};

export type ModelCapabilities = {
  jsonStructure?: boolean;
  tools?: boolean;
};

export type ModelRunnerEnvironment<T> = Record<string, T>;

export type ModelRunnerRunParams = {
  messages: AgentMessage[];
  jsonMode?: boolean;
  options?: Record<string, unknown>; // Доп. настройки (temperature, max_tokens и т.д.)
  model: ModelRunnerConfig;
};

export type ModelRunnerUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type ModelRunnerResult<T> = {
  content: string;
  isJson: boolean;
  tool_calls: ToolCall[];
  raw: unknown;
  usage: ModelRunnerUsage;
  json: () => T | null;
};

// Enhanced type definitions for new architecture
export interface ProviderConfig {
  provider: string;
  model: string;
  options?: Record<string, unknown>;
}

export interface ProviderRequest {
  messages: AgentMessage[];
  jsonMode: boolean;
  options: Record<string, unknown>;
  model: string;
}

export interface ProviderResponse {
  content: string;
  toolCalls: ToolCall[];
  raw: unknown;
  usage: ModelRunnerUsage;
}

export interface ModelProvider {
  readonly providerType: string;
  execute(request: ProviderRequest): Promise<ProviderResponse>;
  supportsJsonMode(): boolean;
  supportsTools(): boolean;
}

// Enhanced error types
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly provider: string
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
