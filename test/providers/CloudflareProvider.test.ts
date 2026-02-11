import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CloudflareProvider } from '@/providers/CloudflareProvider';
import { ConfigurationError, ProviderError } from '@/types';
import type { ModelRunnerEnvironment, ProviderRequest } from '@/types';
import type { Ai } from '@cloudflare/workers-types';
import * as utils from '@/providers/utils';

describe(CloudflareProvider.name, () => {
  let provider: CloudflareProvider;
  let mockRun: ReturnType<typeof vi.fn>;
  let mockEnvironment: ModelRunnerEnvironment<Ai>;

  beforeEach(() => {
    mockRun = vi.fn().mockResolvedValue({ response: 'Test response' });
    mockEnvironment = {
      AI: {
        run: mockRun,
      },
    } as unknown as ModelRunnerEnvironment<Ai>;
    provider = new CloudflareProvider(mockEnvironment);
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create provider with valid environment', () => {
      expect(provider).toBeDefined();
      expect(provider.providerType).toBe('cloudflare');
    });

    it('should throw ConfigurationError when AI is missing', () => {
      const invalidEnvironment = {};
      expect(() => {
        new CloudflareProvider(invalidEnvironment);
      }).toThrow(ConfigurationError);
    });

    it('should include correct provider type in ConfigurationError', () => {
      const invalidEnvironment = {};
      try {
        new CloudflareProvider(invalidEnvironment);
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as ConfigurationError).provider).toBe('cloudflare');
      }
    });

    it('should include missing keys in error message', () => {
      const invalidEnvironment = {};
      expect(() => {
        new CloudflareProvider(invalidEnvironment);
      }).toThrow('Missing required environment variables: AI');
    });
  });

  describe('providerType', () => {
    it('should return "cloudflare"', () => {
      expect(provider.providerType).toBe('cloudflare');
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
    it('should call AI.run with correct model and payload', async () => {
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: { temperature: 0.7 },
        model: '@cf/meta/llama-2-7b-chat-int8',
      };

      await provider.execute(request);

      expect(mockRun).toHaveBeenCalledWith('@cf/meta/llama-2-7b-chat-int8', {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
      });
    });

    it('should include response_format when jsonMode is true', async () => {
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: true,
        options: {},
        model: '@cf/meta/llama-2-7b-chat-int8',
      };

      await provider.execute(request);

      expect(mockRun).toHaveBeenCalledWith('@cf/meta/llama-2-7b-chat-int8', {
        messages: [{ role: 'user', content: 'Hello' }],
        response_format: { type: 'json_object' },
      });
    });

    it('should return parsed response', async () => {
      const mockResponse = { response: 'AI response text' };
      mockRun.mockResolvedValue(mockResponse);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {},
        model: '@cf/meta/llama-2-7b-chat-int8',
      };

      const result = await provider.execute(request);

      expect(result.content).toBe('AI response text');
      expect(result.toolCalls).toEqual([]);
      expect(result.raw).toBe(mockResponse);
      expect(result.usage).toEqual({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      });
    });

    it('should use runWithRetry for retries', async () => {
      const runWithRetrySpy = vi.spyOn(utils, 'runWithRetry');
      runWithRetrySpy.mockResolvedValue({ response: 'Success' });

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {},
        model: '@cf/meta/llama-2-7b-chat-int8',
      };

      await provider.execute(request);

      expect(runWithRetrySpy).toHaveBeenCalledWith(
        expect.any(Function),
        3,
        1000
      );

      runWithRetrySpy.mockRestore();
    });

    it('should throw ProviderError when AI.run fails', async () => {
      const errorMessage = 'Network error';
      mockRun.mockRejectedValue(new Error(errorMessage));

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {},
        model: '@cf/meta/llama-2-7b-chat-int8',
      };

      await expect(provider.execute(request)).rejects.toThrow(ProviderError);
    });

    it('should include provider type in ProviderError', async () => {
      mockRun.mockRejectedValue(new Error('API error'));

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {},
        model: '@cf/meta/llama-2-7b-chat-int8',
      };

      try {
        await provider.execute(request);
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).provider).toBe('cloudflare');
      }
    });

    it('should include error message in ProviderError', async () => {
      mockRun.mockRejectedValue(new Error('Rate limit exceeded'));

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {},
        model: '@cf/meta/llama-2-7b-chat-int8',
      };

      await expect(provider.execute(request)).rejects.toThrow(
        'Cloudflare AI execution failed: Rate limit exceeded'
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockRun.mockRejectedValue('String error');

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {},
        model: '@cf/meta/llama-2-7b-chat-int8',
      };

      await expect(provider.execute(request)).rejects.toThrow(
        'Cloudflare AI execution failed: Unknown error'
      );
    });
  });

  describe('extractContent', () => {
    it('should extract content from string response', () => {
      const response = 'Plain text response';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (provider as any).extractContent(response);
      expect(result).toBe('Plain text response');
    });

    it('should extract content from object with response property', () => {
      const response = { response: 'Object response' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (provider as any).extractContent(response);
      expect(result).toBe('Object response');
    });

    it('should handle empty response property', () => {
      const response = { response: '' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (provider as any).extractContent(response);
      expect(result).toBe('');
    });

    it('should handle null response property', () => {
      const response = { response: null };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (provider as any).extractContent(response);
      expect(result).toBe('');
    });

    it('should stringify unknown response format', () => {
      const response = { data: 'value' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (provider as any).extractContent(response);
      expect(result).toBe('');
    });

    it('should handle undefined response', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (provider as any).extractContent(undefined);
      expect(result).toBe('');
    });
  });

  describe('extractToolCalls', () => {
    it('should return empty array', () => {
      const response = { tool_calls: [] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (provider as any).extractToolCalls(response);
      expect(result).toEqual([]);
    });

    it('should return tool calls', () => {
      const response = {
        tool_calls: [
          {
            arguments: { latitude: '51.5074', longitude: '-0.1278' },
            name: 'getWeather',
          },
        ],
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (provider as any).extractToolCalls(response);
      expect(result).toEqual([
        {
          function: {
            arguments: '{"latitude":"51.5074","longitude":"-0.1278"}',
            name: 'getWeather',
          },
          id: 'tool-call-0',
          type: 'function',
        },
      ]);
    });

    it('should return empty array for any response', () => {
      const response = { some: 'data' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (provider as any).extractToolCalls(response);
      expect(result).toEqual([]);
    });

    it('should return empty array for null response', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (provider as any).extractToolCalls(null);
      expect(result).toEqual([]);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow with json mode', async () => {
      mockRun.mockResolvedValue({ response: '{"result": "success"}' });

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Return JSON' }],
        jsonMode: true,
        options: { max_tokens: 100 },
        model: '@cf/meta/llama-2-7b-chat-int8',
      };

      const result = await provider.execute(request);

      expect(mockRun).toHaveBeenCalledWith('@cf/meta/llama-2-7b-chat-int8', {
        messages: [{ role: 'user', content: 'Return JSON' }],
        response_format: { type: 'json_object' },
        max_tokens: 100,
      });
      expect(result.content).toBe('{"result": "success"}');
      expect(result.usage.totalTokens).toBe(0);
    });

    it('should handle string response from AI.run', async () => {
      mockRun.mockResolvedValue('Simple string response');

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {},
        model: '@cf/meta/llama-2-7b-chat-int8',
      };

      const result = await provider.execute(request);

      expect(result.content).toBe('Simple string response');
    });

    it('should handle complex response object', async () => {
      const complexResponse = {
        response: 'Generated text',
        metadata: { tokens: 100 },
      };
      mockRun.mockResolvedValue(complexResponse);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {},
        model: '@cf/meta/llama-2-7b-chat-int8',
      };

      const result = await provider.execute(request);

      expect(result.content).toBe('Generated text');
      expect(result.raw).toBe(complexResponse);
    });

    it('should preserve original error in ProviderError', async () => {
      const originalError = new Error('Original API error');
      mockRun.mockRejectedValue(originalError);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        jsonMode: false,
        options: {},
        model: '@cf/meta/llama-2-7b-chat-int8',
      };

      try {
        await provider.execute(request);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).originalError).toBe(originalError);
      }
    });
  });
});
