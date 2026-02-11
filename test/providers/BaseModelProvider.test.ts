import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseModelProvider } from '@/providers/BaseModelProvider';
import { ConfigurationError, ProviderError } from '@/types';
import type {
  ModelRunnerEnvironment,
  ProviderRequest,
  ProviderResponse,
  ToolCall,
} from '@/types';

class TestModelProvider extends BaseModelProvider<string> {
  public readonly providerType: string = 'test';

  constructor(environment: ModelRunnerEnvironment<string>) {
    super(environment);
  }

  async execute(_request: ProviderRequest): Promise<ProviderResponse> {
    return {
      content: 'test',
      toolCalls: [],
      raw: {},
      usage: this.buildUsageObject(0, 0, 0),
    };
  }

  protected extractContent(response: unknown): string {
    return (response as { content?: string })?.content || '';
  }

  protected extractToolCalls(response: unknown): ToolCall[] {
    return (response as { toolCalls?: ToolCall[] })?.toolCalls || [];
  }

  supportsJsonMode(): boolean {
    return true;
  }

  supportsTools(): boolean {
    return true;
  }
}

describe(BaseModelProvider.name, () => {
  let provider: TestModelProvider;
  let mockEnvironment: ModelRunnerEnvironment<string>;

  beforeEach(() => {
    mockEnvironment = {
      TEST_KEY: 'test-value',
      ANOTHER_KEY: 'another-value',
    };
    provider = new TestModelProvider(mockEnvironment);
    vi.clearAllMocks();
  });

  describe('validateRequiredKeys', () => {
    it('should not throw when all required keys are present', () => {
      expect(() => {
        provider['validateRequiredKeys'](['TEST_KEY', 'ANOTHER_KEY']);
      }).not.toThrow();
    });

    it('should throw ConfigurationError when required keys are missing', () => {
      expect(() => {
        provider['validateRequiredKeys'](['TEST_KEY', 'MISSING_KEY']);
      }).toThrow(ConfigurationError);
    });

    it('should include missing keys in error message', () => {
      expect(() => {
        provider['validateRequiredKeys'](['MISSING_KEY_1', 'MISSING_KEY_2']);
      }).toThrow(
        'Missing required environment variables: MISSING_KEY_1, MISSING_KEY_2'
      );
    });

    it('should include provider type in ConfigurationError', () => {
      try {
        provider['validateRequiredKeys'](['MISSING_KEY']);
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as ConfigurationError).provider).toBe('test');
      }
    });
  });

  describe('createError', () => {
    it('should create a ProviderError with correct message', () => {
      const error = provider['createError']('Test error message');
      expect(error).toBeInstanceOf(ProviderError);
      expect(error.message).toBe('Test error message');
    });

    it('should create a ProviderError with status code', () => {
      const error = provider['createError']('API Error', 500);
      expect(error.statusCode).toBe(500);
    });

    it('should create a ProviderError with original error', () => {
      const originalError = new Error('Original error');
      const error = provider['createError'](
        'Wrapped error',
        400,
        originalError
      );
      expect(error.originalError).toBe(originalError);
    });

    it('should include provider type in ProviderError', () => {
      const error = provider['createError']('Test message');
      expect(error.provider).toBe('test');
    });
  });

  describe('buildUsageObject', () => {
    it('should create usage object with correct values', () => {
      const usage = provider['buildUsageObject'](100, 50, 150);
      expect(usage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      });
    });

    it('should handle zero values', () => {
      const usage = provider['buildUsageObject'](0, 0, 0);
      expect(usage).toEqual({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      });
    });
  });

  describe('filterDuplicateToolCalls', () => {
    it('should return empty array for empty input', () => {
      const result = provider['filterDuplicateToolCalls']([]);
      expect(result).toEqual([]);
    });

    it('should return all tool calls when no duplicates', () => {
      const toolCalls: ToolCall[] = [
        {
          id: '1',
          type: 'function',
          function: { name: 'func1', arguments: '{}' },
        },
        {
          id: '2',
          type: 'function',
          function: { name: 'func2', arguments: '{}' },
        },
      ];
      const result = provider['filterDuplicateToolCalls'](toolCalls);
      expect(result).toHaveLength(2);
      expect(result).toEqual(toolCalls);
    });

    it('should filter duplicate tool calls by function name', () => {
      const toolCalls: ToolCall[] = [
        {
          id: '1',
          type: 'function',
          function: { name: 'func1', arguments: '{}' },
        },
        {
          id: '2',
          type: 'function',
          function: { name: 'func1', arguments: '{}' },
        },
      ];
      const result = provider['filterDuplicateToolCalls'](toolCalls);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should keep first occurrence of duplicate function names', () => {
      const toolCalls: ToolCall[] = [
        {
          id: '1',
          type: 'function',
          function: { name: 'func1', arguments: '{"arg": 1}' },
        },
        {
          id: '2',
          type: 'function',
          function: { name: 'func1', arguments: '{"arg": 2}' },
        },
        {
          id: '3',
          type: 'function',
          function: { name: 'func2', arguments: '{}' },
        },
      ];
      const result = provider['filterDuplicateToolCalls'](toolCalls);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
    });
  });

  describe('constructor', () => {
    it('should store environment reference', () => {
      const env = { KEY: 'value' };
      const testProvider = new TestModelProvider(env);
      expect(testProvider).toBeDefined();
    });
  });

  describe('providerType', () => {
    it('should have correct provider type', () => {
      expect(provider.providerType).toBe('test');
    });
  });
});
