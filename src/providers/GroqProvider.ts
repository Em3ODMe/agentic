import { BaseModelProvider } from './BaseModelProvider';
import type {
  ModelRunnerEnvironment,
  ProviderRequest,
  ProviderResponse,
  ToolCall,
} from '../types';
import { runWithRetry } from './utils';

export interface GroqUsageData {
  queue_time: number;
  prompt_tokens: number;
  prompt_time: number;
  completion_tokens: number;
  completion_time: number;
  total_tokens: number;
  total_time: number;
  completion_tokens_details: { reasoning_tokens: number };
}

export interface GroqResponse {
  choices: Array<{
    message: {
      content?: string;
      tool_calls?: ToolCall[];
    };
  }>;
  usage?: GroqUsageData;
}

export class GroqProvider extends BaseModelProvider<string> {
  public readonly providerType: string = 'groq';
  private readonly apiEndpoint =
    'https://api.groq.com/openai/v1/chat/completions';

  constructor(environment: ModelRunnerEnvironment<string>) {
    super(environment);
    this.validateRequiredKeys(['GROQ_API_KEY']);
  }

  supportsJsonMode(): boolean {
    return true;
  }

  supportsTools(): boolean {
    return true;
  }

  async execute(request: ProviderRequest): Promise<ProviderResponse> {
    const payload = this.buildPayload(request);

    try {
      const response = await this.makeRequest(payload);
      return this.parseResponse(response);
    } catch (error) {
      if (error instanceof Response) {
        const errorText = await error.text();
        throw this.createError(
          `Groq API Error (${error.status}): ${errorText}. Model: ${request.model}`,
          error.status,
          errorText
        );
      }
      throw this.createError(
        `Groq execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error
      );
    }
  }

  private buildPayload(request: ProviderRequest): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      ...request.options,
    };

    if (request.options?.tools) {
      payload.tool_choice = 'auto';
    }

    if (request.jsonMode && !request.options?.tools) {
      payload.response_format = { type: 'json_object' };
    }

    return payload;
  }

  private async makeRequest(
    payload: Record<string, unknown>
  ): Promise<GroqResponse> {
    const response = await runWithRetry(
      async () => {
        return fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.environment.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      },
      3,
      1000
    );

    if (!response) {
      throw this.createError(
        `Groq execution failed: No response from Groq API`,
        undefined,
        undefined
      );
    }

    return response?.json() as Promise<GroqResponse>;
  }

  protected extractContent(data: GroqResponse): string {
    return data.choices?.[0]?.message?.content || '';
  }

  protected extractToolCalls(data: GroqResponse): ToolCall[] {
    return data.choices?.[0]?.message?.tool_calls || [];
  }

  private parseResponse(data: GroqResponse): ProviderResponse {
    const content = this.extractContent(data);
    const toolCalls = this.filterDuplicateToolCalls(
      this.extractToolCalls(data)
    );
    const usage = data.usage
      ? this.buildUsageObject(
          data.usage.prompt_tokens,
          data.usage.completion_tokens,
          data.usage.total_tokens
        )
      : this.buildUsageObject(0, 0, 0);

    return {
      content,
      toolCalls,
      raw: data,
      usage,
    };
  }
}
