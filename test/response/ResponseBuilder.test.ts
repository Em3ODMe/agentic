import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResponseBuilder } from '../../src/response/ResponseBuilder';
import { JsonParser } from '../../src/response/JsonParser';
import type { ToolCall } from '../../src/types';

vi.mock('../../src/response/JsonParser', () => ({
  JsonParser: {
    parse: vi.fn(),
  },
}));

describe('ResponseBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setter methods', () => {
    it('should set content and return this for chaining', () => {
      const builder = new ResponseBuilder();
      const result = builder.setContent('Hello World');
      expect(result).toBe(builder);
    });

    it('should set tool calls and return this for chaining', () => {
      const builder = new ResponseBuilder();
      const toolCalls: ToolCall[] = [
        {
          id: '1',
          type: 'function',
          function: { name: 'test', arguments: '{}' },
        },
      ];
      const result = builder.setToolCalls(toolCalls);
      expect(result).toBe(builder);
    });

    it('should set raw response and return this for chaining', () => {
      const builder = new ResponseBuilder();
      const raw = { data: 'test' };
      const result = builder.setRawResponse(raw);
      expect(result).toBe(builder);
    });

    it('should set usage and return this for chaining', () => {
      const builder = new ResponseBuilder();
      const usage = { promptTokens: 10, completionTokens: 20, totalTokens: 30 };
      const result = builder.setUsage(usage);
      expect(result).toBe(builder);
    });

    it('should set json mode and return this for chaining', () => {
      const builder = new ResponseBuilder();
      const result = builder.setJsonMode(true);
      expect(result).toBe(builder);
    });
  });

  describe('build method', () => {
    it('should build with default values', () => {
      const result = new ResponseBuilder().build();
      expect(result.content).toBe('');
      expect(result.isJson).toBe(false);
      expect(result.tool_calls).toEqual([]);
      expect(result.raw).toBeNull();
      expect(result.usage).toEqual({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      });
    });

    it('should build with content set', () => {
      const result = new ResponseBuilder().setContent('Hello').build();
      expect(result.content).toBe('Hello');
    });

    it('should build with tool calls set', () => {
      const toolCalls: ToolCall[] = [
        {
          id: '1',
          type: 'function',
          function: { name: 'test', arguments: '{}' },
        },
      ];
      const result = new ResponseBuilder().setToolCalls(toolCalls).build();
      expect(result.tool_calls).toEqual(toolCalls);
    });

    it('should build with raw response set', () => {
      const raw = { data: 'test' };
      const result = new ResponseBuilder().setRawResponse(raw).build();
      expect(result.raw).toBe(raw);
    });

    it('should build with usage set', () => {
      const usage = { promptTokens: 10, completionTokens: 20, totalTokens: 30 };
      const result = new ResponseBuilder().setUsage(usage).build();
      expect(result.usage).toBe(usage);
    });
  });

  describe('JSON detection in build', () => {
    it('should set isJson to true when jsonMode is true and no tool calls', () => {
      const result = new ResponseBuilder()
        .setContent('some content')
        .setJsonMode(true)
        .build();
      expect(result.isJson).toBe(true);
    });

    it('should set isJson to true when content starts with "{" and no tool calls', () => {
      const result = new ResponseBuilder()
        .setContent('{"key": "value"}')
        .build();
      expect(result.isJson).toBe(true);
    });

    it('should set isJson to false when there are tool calls, even with jsonMode true', () => {
      const toolCalls: ToolCall[] = [
        {
          id: '1',
          type: 'function',
          function: { name: 'test', arguments: '{}' },
        },
      ];
      const result = new ResponseBuilder()
        .setContent('{"key": "value"}')
        .setJsonMode(true)
        .setToolCalls(toolCalls)
        .build();
      expect(result.isJson).toBe(false);
    });

    it('should set isJson to false when there are tool calls, even if content starts with "{"', () => {
      const toolCalls: ToolCall[] = [
        {
          id: '1',
          type: 'function',
          function: { name: 'test', arguments: '{}' },
        },
      ];
      const result = new ResponseBuilder()
        .setContent('{"key": "value"}')
        .setToolCalls(toolCalls)
        .build();
      expect(result.isJson).toBe(false);
    });

    it('should set isJson to false when jsonMode is false and content does not start with "{"', () => {
      const result = new ResponseBuilder().setContent('plain text').build();
      expect(result.isJson).toBe(false);
    });
  });

  describe('json method', () => {
    it('should call JsonParser.parse with correct arguments', () => {
      const mockParse = vi.mocked(JsonParser.parse);
      mockParse.mockReturnValue({ parsed: true });

      const result = new ResponseBuilder()
        .setContent('{"key": "value"}')
        .setJsonMode(true)
        .build();

      const parsed = result.json();
      expect(mockParse).toHaveBeenCalledWith('{"key": "value"}', true);
      expect(parsed).toEqual({ parsed: true });
    });

    it('should call JsonParser.parse with isJson false when not in JSON mode', () => {
      const mockParse = vi.mocked(JsonParser.parse);
      mockParse.mockReturnValue({ parsed: false });

      const result = new ResponseBuilder().setContent('plain text').build();

      const parsed = result.json();
      expect(mockParse).toHaveBeenCalledWith('plain text', false);
      expect(parsed).toEqual({ parsed: false });
    });
  });

  describe('static create method', () => {
    it('should return a new ResponseBuilder instance', () => {
      const builder = ResponseBuilder.create<string>();
      expect(builder).toBeInstanceOf(ResponseBuilder);
    });

    it('should allow generic type parameter', () => {
      const builder = ResponseBuilder.create<{ name: string }>();
      expect(builder).toBeInstanceOf(ResponseBuilder);
    });
  });
});
