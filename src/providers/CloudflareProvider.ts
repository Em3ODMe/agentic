import { Ai, AiModels } from '@cloudflare/workers-types';
import { BaseModelProvider } from './BaseModelProvider';
import { runWithRetry } from './utils';
import type {
  ModelRunnerEnvironment,
  ProviderRequest,
  ProviderResponse,
  ToolCall,
} from '../types';

export class CloudflareProvider extends BaseModelProvider<Ai> {
  public readonly providerType: string = 'cloudflare';

  constructor(environment: ModelRunnerEnvironment<Ai>) {
    super(environment);
    this.validateRequiredKeys(['AI']);
  }

  supportsJsonMode(): boolean {
    return true;
  }

  supportsTools(): boolean {
    return true;
  }

  async execute(request: ProviderRequest): Promise<ProviderResponse> {
    const payload: Record<string, unknown> = {
      messages: request.messages,
      ...request.options,
    };

    if (request.jsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    try {
      const response = await runWithRetry(
        async () => {
          return this.environment.AI!.run(
            request.model as keyof AiModels,
            payload
          );
        },
        3,
        1000
      );

      return this.parseResponse(response);
    } catch (error) {
      throw this.createError(
        `Cloudflare AI execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error
      );
    }
  }

  private parseResponse(response: unknown): ProviderResponse {
    const content = this.extractContent(response);
    const toolCalls = this.extractToolCalls(response);
    const usage = this.buildUsageObject(0, 0, 0); // Cloudflare doesn't provide usage data

    return {
      content,
      toolCalls,
      raw: response,
      usage,
    };
  }

  protected extractContent(response: unknown): string {
    if (typeof response === 'string') {
      return response;
    }

    if (response && typeof response === 'object') {
      // Handle standard response format
      if ('response' in response) {
        return String(response.response || '');
      }
    }

    return '';
  }

  protected extractToolCalls(response: unknown): ToolCall[] {
    if (!response || typeof response !== 'object') {
      return [];
    }

    const toolCalls = (response as Record<string, unknown>).tool_calls;
    if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
      return [];
    }

    return toolCalls.map((toolCall, index) => {
      const tc = toolCall as Record<string, unknown>;
      const args = tc.arguments as Record<string, unknown> | string;
      const argsString = typeof args === 'string' ? args : JSON.stringify(args);

      return {
        id: `tool-call-${index}`,
        type: 'function' as const,
        function: {
          name: String(tc.name || ''),
          arguments: argsString,
        },
      };
    });
  }
}
