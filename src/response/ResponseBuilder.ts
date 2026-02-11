import type { ModelRunnerResult, ModelRunnerUsage, ToolCall } from '../types';
import { JsonParser } from './JsonParser';

export class ResponseBuilder<T = unknown> {
  private content: string = '';
  private toolCalls: ToolCall[] = [];
  private rawResponse: unknown = null;
  private usage: ModelRunnerUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
  private jsonMode: boolean = false;

  setContent(content: string): this {
    this.content = content;
    return this;
  }

  setToolCalls(toolCalls: ToolCall[]): this {
    this.toolCalls = toolCalls;
    return this;
  }

  setRawResponse(raw: unknown): this {
    this.rawResponse = raw;
    return this;
  }

  setUsage(usage: ModelRunnerUsage): this {
    this.usage = usage;
    return this;
  }

  setJsonMode(jsonMode: boolean): this {
    this.jsonMode = jsonMode;
    return this;
  }

  build(): ModelRunnerResult<T> {
    const isJson =
      this.toolCalls.length === 0 &&
      (this.jsonMode || this.content.trim().startsWith('{'));

    return {
      content: this.content,
      isJson,
      tool_calls: this.toolCalls,
      raw: this.rawResponse,
      usage: this.usage,
      json: () => JsonParser.parse<T>(this.content, isJson),
    };
  }

  static create<T = unknown>(): ResponseBuilder<T> {
    return new ResponseBuilder<T>();
  }
}
