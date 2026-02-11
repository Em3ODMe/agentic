import type {
  ModelProvider,
  ModelRunnerEnvironment,
  ProviderRequest,
  ProviderResponse,
  ToolCall,
} from '../types';
import { ConfigurationError, ProviderError } from '../types';

export abstract class BaseModelProvider<T> implements ModelProvider {
  public abstract readonly providerType: string;

  constructor(protected environment: ModelRunnerEnvironment<T>) {}

  abstract execute(request: ProviderRequest): Promise<ProviderResponse>;
  protected abstract extractContent(response: unknown): string;
  protected abstract extractToolCalls(response: unknown): ToolCall[];
  abstract supportsJsonMode(): boolean;
  abstract supportsTools(): boolean;

  protected validateRequiredKeys(envKeys: string[]): void {
    const missing = envKeys.filter((key) => !this.environment[key]);
    if (missing.length > 0) {
      throw new ConfigurationError(
        `Missing required environment variables: ${missing.join(', ')}`,
        this.providerType
      );
    }
  }

  protected createError(
    message: string,
    statusCode?: number,
    originalError?: unknown
  ): ProviderError {
    return new ProviderError(
      message,
      this.providerType,
      statusCode,
      originalError
    );
  }

  protected buildUsageObject(
    promptTokens: number,
    completionTokens: number,
    totalTokens: number
  ) {
    return {
      promptTokens,
      completionTokens,
      totalTokens,
    };
  }

  protected filterDuplicateToolCalls(toolCalls: ToolCall[]): ToolCall[] {
    const seen = new Set<string>();
    return toolCalls.filter((toolCall) => {
      const key = toolCall.function.name;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
