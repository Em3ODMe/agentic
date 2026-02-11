import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GroqProvider } from '@/providers/GroqProvider';
import { ConfigurationError, ProviderError } from '@/types';
import type {
  ModelRunnerEnvironment,
  ProviderRequest,
  ToolCall,
} from '@/types';
import * as utils from '@/providers/utils';

describe(GroqProvider.name, () => {
  let provider: GroqProvider;
  let mockEnvironment: ModelRunnerEnvironment<string>;
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockRunWithRetry: ReturnType<typeof vi.spyOn>;

  const createMockResponse = (
    overrides: Record<string, unknown> = {}
  ): Response =>
    ({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Test response',
              tool_calls: [],
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
        ...overrides,
      }),
    }) as unknown as Response;

  beforeEach(() => {
    mockEnvironment = {
      GROQ_API_KEY: 'test-api-key',
    };

    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    mockRunWithRetry = vi.spyOn(utils, 'runWithRetry');
    mockRunWithRetry.mockImplementation(async <T>(fn: () => Promise<T>) =>
      fn()
    );

    provider = new GroqProvider(mockEnvironment);
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create provider with valid environment', () => {
      expect(provider).toBeDefined();
      expect(provider.providerType).toBe('groq');
    });

    it('should throw ConfigurationError when GROQ_API_KEY is missing', () => {
      const invalidEnvironment = {};
      expect(() => {
        new GroqProvider(invalidEnvironment);
      }).toThrow(ConfigurationError);
    });

    it('should include correct provider type in ConfigurationError', () => {
      const invalidEnvironment = {};
      try {
        new GroqProvider(invalidEnvironment);
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as ConfigurationError).provider).toBe('groq');
      }
    });

    it('should include missing keys in error message', () => {
      const invalidEnvironment = {};
      expect(() => {
        new GroqProvider(invalidEnvironment);
      }).toThrow('Missing required environment variables: GROQ_API_KEY');
    });
  });

  describe('providerType', () => {
    it('should return "groq"', () => {
      expect(provider.providerType).toBe('groq');
    });
  });

  describe('supportsJsonMode', () => {
    it('should return true', () => {
      expect(provider.supportsJsonMode()).toBe(true);
    });
  });

  describe('supportsTools', () => {
    it('should return true', () => {
      expect(provider.supportsTools()).toBe(true);
    });
  });

  describe('execute', () => {
    it('should make request with correct payload', async () => {
      const mockResponse = createMockResponse();
      mockFetch.mockResolvedValue(mockResponse);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: { temperature: 0.7 },
        model: 'llama-3.1-8b-instant',
      };

      await provider.execute(request);

      expect(mockRunWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        3,
        1000
      );

      const retryFn = mockRunWithRetry.mock.calls[0][0];
      await retryFn();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: 'Hello' }],
            temperature: 0.7,
          }),
        }
      );
    });

    it('should include response_format when jsonMode is true without tools', async () => {
      const mockResponse = createMockResponse();
      mockFetch.mockResolvedValue(mockResponse);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Return JSON' }],
        jsonMode: true,
        options: {},
        model: 'llama-3.1-8b-instant',
      };

      await provider.execute(request);

      const retryFn = mockRunWithRetry.mock.calls[0][0];
      await retryFn();

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.response_format).toEqual({ type: 'json_object' });
    });

    it('should not include response_format when tools are present', async () => {
      const mockResponse = createMockResponse();
      mockFetch.mockResolvedValue(mockResponse);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Use tool' }],
        jsonMode: true,
        options: {
          tools: [
            {
              type: 'function',
              function: {
                name: 'test_function',
                description: 'A test function',
                parameters: {},
              },
            },
          ],
        },
        model: 'llama-3.1-8b-instant',
      };

      await provider.execute(request);

      const retryFn = mockRunWithRetry.mock.calls[0][0];
      await retryFn();

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.response_format).toBeUndefined();
      expect(body.tool_choice).toBe('auto');
    });

    it('should add tool_choice when tools are present', async () => {
      const mockResponse = createMockResponse();
      mockFetch.mockResolvedValue(mockResponse);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Use tool' }],
        jsonMode: false,
        options: {
          tools: [
            {
              type: 'function',
              function: {
                name: 'test_function',
                description: 'A test function',
                parameters: {},
              },
            },
          ],
        },
        model: 'llama-3.1-8b-instant',
      };

      await provider.execute(request);

      const retryFn = mockRunWithRetry.mock.calls[0][0];
      await retryFn();

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.tool_choice).toBe('auto');
    });

    it('should return parsed response with content', async () => {
      const mockResponse = createMockResponse({
        choices: [
          {
            message: {
              content: 'AI response text',
              tool_calls: [],
            },
          },
        ],
      });
      mockFetch.mockResolvedValue(mockResponse);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {},
        model: 'llama-3.1-8b-instant',
      };

      const result = await provider.execute(request);

      expect(result.content).toBe('AI response text');
      expect(result.toolCalls).toEqual([]);
      expect(result.usage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      });
    });

    it('should return parsed response with tool calls', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'get_weather',
            arguments: '{"location": "Paris"}',
          },
        },
      ];

      const mockResponse = createMockResponse({
        choices: [
          {
            message: {
              content: null,
              tool_calls: toolCalls,
            },
          },
        ],
      });
      mockFetch.mockResolvedValue(mockResponse);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Weather?' }],
        jsonMode: false,
        options: {},
        model: 'llama-3.1-8b-instant',
      };

      const result = await provider.execute(request);

      expect(result.content).toBe('');
      expect(result.toolCalls).toEqual(toolCalls);
    });

    it('should filter duplicate tool calls', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'get_weather',
            arguments: '{"location": "Paris"}',
          },
        },
        {
          id: 'call_2',
          type: 'function',
          function: {
            name: 'get_weather',
            arguments: '{"location": "London"}',
          },
        },
      ];

      const mockResponse = createMockResponse({
        choices: [
          {
            message: {
              content: null,
              tool_calls: toolCalls,
            },
          },
        ],
      });
      mockFetch.mockResolvedValue(mockResponse);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Weather?' }],
        jsonMode: false,
        options: {},
        model: 'llama-3.1-8b-instant',
      };

      const result = await provider.execute(request);

      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].id).toBe('call_1');
    });

    it('should handle missing usage data', async () => {
      const mockResponse = createMockResponse({ usage: undefined });
      mockFetch.mockResolvedValue(mockResponse);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {},
        model: 'llama-3.1-8b-instant',
      };

      const result = await provider.execute(request);

      expect(result.usage).toEqual({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      });
    });

    it('should throw ProviderError on HTTP error response', async () => {
      const errorResponse = {
        status: 429,
        text: vi.fn().mockResolvedValue('Rate limit exceeded'),
      };

      mockRunWithRetry.mockRejectedValue(errorResponse);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {},
        model: 'llama-3.1-8b-instant',
      };

      await expect(provider.execute(request)).rejects.toThrow(ProviderError);
    });

    it('should include status code and error text in HTTP error', async () => {
      const errorResponse = new Response('Rate limit exceeded', {
        status: 429,
      });

      mockRunWithRetry.mockRejectedValue(errorResponse);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {},
        model: 'llama-3.1-8b-instant',
      };

      try {
        await provider.execute(request);
      } catch (error) {
        const providerError = error as ProviderError;
        expect(providerError).toBeInstanceOf(ProviderError);
        expect(providerError.statusCode).toBe(429);
        expect(providerError.message).toContain('Groq API Error (429)');
        expect(providerError.message).toContain('Rate limit exceeded');
        expect(providerError.message).toContain('llama-3.1-8b-instant');
      }
    });

    it('should throw ProviderError on network error', async () => {
      mockRunWithRetry.mockRejectedValue(new Error('Network timeout'));

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {},
        model: 'llama-3.1-8b-instant',
      };

      await expect(provider.execute(request)).rejects.toThrow(ProviderError);
    });

    it('should include provider type in ProviderError', async () => {
      mockRunWithRetry.mockRejectedValue(new Error('API error'));

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {},
        model: 'llama-3.1-8b-instant',
      };

      try {
        await provider.execute(request);
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).provider).toBe('groq');
      }
    });

    it('should include error message in ProviderError', async () => {
      mockRunWithRetry.mockRejectedValue(new Error('Connection failed'));

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {},
        model: 'llama-3.1-8b-instant',
      };

      await expect(provider.execute(request)).rejects.toThrow(
        'Groq execution failed: Connection failed'
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockRunWithRetry.mockRejectedValue('String error');

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {},
        model: 'llama-3.1-8b-instant',
      };

      await expect(provider.execute(request)).rejects.toThrow(
        'Groq execution failed: Unknown error'
      );
    });

    it('should throw error when no response from API', async () => {
      mockRunWithRetry.mockResolvedValue(null);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {},
        model: 'llama-3.1-8b-instant',
      };

      try {
        await provider.execute(request);
      } catch (error) {
        const providerError = error as ProviderError;
        expect(providerError).toBeInstanceOf(ProviderError);
        expect(providerError.message).toContain('No response from Groq API');
      }
    });

    it('should preserve original error in ProviderError', async () => {
      const originalError = new Error('Original API error');
      mockRunWithRetry.mockRejectedValue(originalError);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {},
        model: 'llama-3.1-8b-instant',
      };

      try {
        await provider.execute(request);
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).originalError).toBe(originalError);
      }
    });
  });

  describe('extractContent', () => {
    it('should extract content from response', () => {
      const response = {
        choices: [
          {
            message: {
              content: 'Extracted content',
            },
          },
        ],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (provider as any).extractContent(response);
      expect(result).toBe('Extracted content');
    });

    it('should return empty string when content is missing', () => {
      const response = {
        choices: [
          {
            message: {},
          },
        ],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (provider as any).extractContent(response);
      expect(result).toBe('');
    });

    it('should return empty string when choices are missing', () => {
      const response = {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (provider as any).extractContent(response);
      expect(result).toBe('');
    });

    it('should return empty string when choices is empty', () => {
      const response = {
        choices: [],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (provider as any).extractContent(response);
      expect(result).toBe('');
    });
  });

  describe('extractToolCalls', () => {
    it('should extract tool calls from response', () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'get_weather',
            arguments: '{"location": "Paris"}',
          },
        },
      ];

      const response = {
        choices: [
          {
            message: {
              tool_calls: toolCalls,
            },
          },
        ],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (provider as any).extractToolCalls(response);
      expect(result).toEqual(toolCalls);
    });

    it('should return empty array when tool_calls are missing', () => {
      const response = {
        choices: [
          {
            message: {},
          },
        ],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (provider as any).extractToolCalls(response);
      expect(result).toEqual([]);
    });

    it('should return empty array when choices are missing', () => {
      const response = {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (provider as any).extractToolCalls(response);
      expect(result).toEqual([]);
    });
  });

  describe('buildPayload', () => {
    it('should include model and messages in payload', () => {
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {},
        model: 'llama-3.1-8b-instant',
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = (provider as any).buildPayload(request);

      expect(payload.model).toBe('llama-3.1-8b-instant');
      expect(payload.messages).toEqual([{ role: 'user', content: 'Hello' }]);
    });

    it('should merge options into payload', () => {
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: { temperature: 0.5, max_tokens: 100 },
        model: 'llama-3.1-8b-instant',
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = (provider as any).buildPayload(request);

      expect(payload.temperature).toBe(0.5);
      expect(payload.max_tokens).toBe(100);
    });

    it('should include response_format for jsonMode without tools', () => {
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: true,
        options: {},
        model: 'llama-3.1-8b-instant',
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = (provider as any).buildPayload(request);

      expect(payload.response_format).toEqual({ type: 'json_object' });
    });

    it('should not include response_format when tools are present', () => {
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: true,
        options: {
          tools: [
            {
              type: 'function',
              function: {
                name: 'test',
                description: 'Test',
                parameters: {},
              },
            },
          ],
        },
        model: 'llama-3.1-8b-instant',
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = (provider as any).buildPayload(request);

      expect(payload.response_format).toBeUndefined();
    });

    it('should include tool_choice when tools are present', () => {
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {
          tools: [
            {
              type: 'function',
              function: {
                name: 'test',
                description: 'Test',
                parameters: {},
              },
            },
          ],
        },
        model: 'llama-3.1-8b-instant',
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = (provider as any).buildPayload(request);

      expect(payload.tool_choice).toBe('auto');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow with json mode', async () => {
      const mockResponse = createMockResponse({
        choices: [
          {
            message: {
              content: '{"result": "success"}',
            },
          },
        ],
      });
      mockFetch.mockResolvedValue(mockResponse);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Return JSON' }],
        jsonMode: true,
        options: { temperature: 0.7 },
        model: 'llama-3.1-8b-instant',
      };

      const result = await provider.execute(request);

      const retryFn = mockRunWithRetry.mock.calls[0][0];
      await retryFn();

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.response_format).toEqual({ type: 'json_object' });
      expect(body.temperature).toBe(0.7);
      expect(result.content).toBe('{"result": "success"}');
    });

    it('should handle complete workflow with tool calls', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'calculate',
            arguments: '{"a": 5, "b": 3}',
          },
        },
      ];

      const mockResponse = createMockResponse({
        choices: [
          {
            message: {
              content: null,
              tool_calls: toolCalls,
            },
          },
        ],
      });
      mockFetch.mockResolvedValue(mockResponse);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Calculate 5 + 3' }],
        jsonMode: false,
        options: {
          tools: [
            {
              type: 'function',
              function: {
                name: 'calculate',
                description: 'Calculate sum',
                parameters: {
                  type: 'object',
                  properties: {
                    a: { type: 'number' },
                    b: { type: 'number' },
                  },
                },
              },
            },
          ],
        },
        model: 'llama-3.1-8b-instant',
      };

      const result = await provider.execute(request);

      const retryFn = mockRunWithRetry.mock.calls[0][0];
      await retryFn();

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.tool_choice).toBe('auto');
      expect(body.response_format).toBeUndefined();
      expect(result.toolCalls).toEqual(toolCalls);
    });
  });
});
