import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ModelRunner } from '@/ModelRunner';
import { RuntimeConfigManager } from '@/config/Configuration';

describe(ModelRunner.name, () => {
  let modelRunner: ModelRunner;
  const mockEnvironment = {
    AI: {
      run: vi.fn().mockResolvedValue({ response: 'Test response' }),
    },
    GROQ_API_KEY: 'test-key',
  };

  beforeEach(() => {
    modelRunner = new ModelRunner(mockEnvironment);
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Reset runtime config after each test
    RuntimeConfigManager.updateConfig({
      timeout: 30000,
      retries: { maxAttempts: 3, baseDelay: 1000, maxDelay: 10000 },
      caching: { enabled: false, ttl: 300000 },
      logging: { enabled: true, level: 'info' },
    });
  });

  it('should run cloudflare provider successfully', async () => {
    const result = await modelRunner.run({
      messages: [{ role: 'user', content: 'test' }],
      model: { provider: 'cloudflare', model: 'test-model' },
      jsonMode: false,
    });

    expect(result.content).toBe('Test response');
    expect(result.isJson).toBe(false);
    expect(result.tool_calls).toEqual([]);
  });

  it('should validate provider capabilities', async () => {
    const result = await modelRunner.run({
      messages: [{ role: 'user', content: 'test' }],
      model: { provider: 'cloudflare', model: 'test-model' },
      jsonMode: true,
    });

    expect(result.content).toBe('Test response');
  });

  it('should handle errors gracefully', async () => {
    const invalidEnvironment = {};
    const invalidRunner = new ModelRunner(invalidEnvironment);

    await expect(
      invalidRunner.run({
        messages: [{ role: 'user', content: 'test' }],
        model: { provider: 'cloudflare', model: 'test-model' },
      })
    ).rejects.toThrow(
      '(ModelRunner.run) Missing required environment variables for cloudflare: AI'
    );
  });

  describe('static methods', () => {
    describe('getSupportedProviders (lines 63-64)', () => {
      it('should return list of supported providers', () => {
        const providers = ModelRunner.getSupportedProviders();
        expect(providers).toContain('cloudflare');
        expect(providers).toContain('groq');
        expect(providers.length).toBe(2);
      });
    });

    describe('getProviderCapabilities (lines 69-78)', () => {
      it('should return provider capabilities for supported provider', () => {
        const capabilities = ModelRunner.getProviderCapabilities('cloudflare');
        expect(capabilities).toBeDefined();
        expect(capabilities?.jsonMode).toBe(true);
        expect(capabilities?.tools).toBe(true);
        expect(capabilities?.streaming).toBe(false);
      });

      it('should return undefined for unsupported provider', () => {
        const capabilities = ModelRunner.getProviderCapabilities(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          'unknown' as any
        );
        expect(capabilities).toBeUndefined();
      });

      it('should return correct capabilities for groq provider', () => {
        const capabilities = ModelRunner.getProviderCapabilities('groq');
        expect(capabilities).toBeDefined();
        expect(capabilities?.jsonMode).toBe(true);
        expect(capabilities?.tools).toBe(true);
        expect(capabilities?.streaming).toBe(true);
      });
    });

    describe('updateRuntimeConfig (lines 83-87)', () => {
      it('should update runtime configuration', () => {
        ModelRunner.updateRuntimeConfig({ timeout: 60000 });
        const config = RuntimeConfigManager.getConfig();
        expect(config.timeout).toBe(60000);
      });

      it('should deep merge nested configuration', () => {
        ModelRunner.updateRuntimeConfig({
          retries: { maxAttempts: 5, baseDelay: 1000, maxDelay: 10000 },
          logging: { enabled: true, level: 'debug' },
        });
        const config = RuntimeConfigManager.getConfig();
        expect(config.retries?.maxAttempts).toBe(5);
        expect(config.retries?.baseDelay).toBe(1000);
        expect(config.logging?.level).toBe('debug');
        expect(config.logging?.enabled).toBe(true);
      });
    });
  });

  describe('validateCapabilities', () => {
    it('should not throw when provider supports JSON mode', async () => {
      const result = await modelRunner.run({
        messages: [{ role: 'user', content: 'test' }],
        model: { provider: 'cloudflare', model: 'test-model' },
        jsonMode: true,
      });
      expect(result.content).toBe('Test response');
    });

    it('should not throw when provider supports tools', async () => {
      const result = await modelRunner.run({
        messages: [{ role: 'user', content: 'test' }],
        model: { provider: 'cloudflare', model: 'test-model' },
        options: { tools: true },
      });
      expect(result.content).toBe('Test response');
    });

    it('should throw error when provider does not support JSON mode (line 107)', () => {
      const mockProvider = {
        providerType: 'mock',
        supportsJsonMode: vi.fn().mockReturnValue(false),
        supportsTools: vi.fn().mockReturnValue(true),
        execute: vi.fn(),
      };

      // Access private method through type assertion
      const validateCapabilities =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (modelRunner as any).validateCapabilities.bind(modelRunner);

      expect(() => {
        validateCapabilities(mockProvider, true, {});
      }).toThrow('Provider mock does not support JSON mode');
    });

    it('should throw error when provider does not support tools (line 114)', () => {
      const mockProvider = {
        providerType: 'mock',
        supportsJsonMode: vi.fn().mockReturnValue(true),
        supportsTools: vi.fn().mockReturnValue(false),
        execute: vi.fn(),
      };

      const validateCapabilities =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (modelRunner as any).validateCapabilities.bind(modelRunner);

      expect(() => {
        validateCapabilities(mockProvider, false, { tools: true });
      }).toThrow('Provider mock does not support tools');
    });
  });
});
