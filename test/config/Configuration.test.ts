import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConfigurationValidator,
  RuntimeConfigManager,
  ProviderConfigSchema,
} from '@/config/Configuration';
import type { ModelRunnerProvider } from '@/types';

describe(ConfigurationValidator.name, () => {
  const mockEnvironment = {
    AI: {
      run: vi.fn().mockResolvedValue({ response: 'Test response' }),
    },
    GROQ_API_KEY: 'test-key',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate cloudflare environment', () => {
    expect(() => {
      ConfigurationValidator.validateProvider('cloudflare', mockEnvironment);
    }).not.toThrow();
  });

  it('should validate groq environment', () => {
    expect(() => {
      ConfigurationValidator.validateProvider('groq', mockEnvironment);
    }).not.toThrow();
  });

  it('should throw error for missing environment variables', () => {
    expect(() => {
      ConfigurationValidator.validateProvider('groq', {});
    }).toThrow('Missing required environment variables for groq: GROQ_API_KEY');
  });

  it('should throw error for unknown provider (line 75)', () => {
    expect(() => {
      ConfigurationValidator.validateProvider(
        'unknown' as ModelRunnerProvider,
        {}
      );
    }).toThrow('Unknown provider: unknown');
  });

  it('should validate model - minLength (lines 89-91)', () => {
    const config: ProviderConfigSchema = {
      requiredEnvVars: [],
      optionalEnvVars: [],
      defaultOptions: {},
      supportedFeatures: { jsonMode: true, tools: false, streaming: false },
      modelValidation: { minLength: 5 },
    };
    ConfigurationValidator.registerProviderConfig(
      'test-model' as ModelRunnerProvider,
      config
    );
    expect(() => {
      ConfigurationValidator.validateModel(
        'test-model' as ModelRunnerProvider,
        'abc'
      );
    }).toThrow('Model name must be at least 5 characters long');
  });

  it('should validate model - maxLength (lines 93-95)', () => {
    const config: ProviderConfigSchema = {
      requiredEnvVars: [],
      optionalEnvVars: [],
      defaultOptions: {},
      supportedFeatures: { jsonMode: true, tools: false, streaming: false },
      modelValidation: { maxLength: 10 },
    };
    ConfigurationValidator.registerProviderConfig(
      'test-model2' as ModelRunnerProvider,
      config
    );
    expect(() => {
      ConfigurationValidator.validateModel(
        'test-model2' as ModelRunnerProvider,
        'this-is-too-long-name'
      );
    }).toThrow('Model name must not exceed 10 characters');
  });

  it('should validate model - pattern (lines 97-98)', () => {
    const config: ProviderConfigSchema = {
      requiredEnvVars: [],
      optionalEnvVars: [],
      defaultOptions: {},
      supportedFeatures: { jsonMode: true, tools: false, streaming: false },
      modelValidation: { pattern: /^[a-z-]+$/ },
    };
    ConfigurationValidator.registerProviderConfig(
      'test-model3' as ModelRunnerProvider,
      config
    );
    expect(() => {
      ConfigurationValidator.validateModel(
        'test-model3' as ModelRunnerProvider,
        'MODEL123'
      );
    }).toThrow('Model name does not match required pattern');
  });

  it('should return early if no config or modelValidation (lines 83-85)', () => {
    expect(() => {
      ConfigurationValidator.validateModel('cloudflare', 'any-model');
    }).not.toThrow();
  });

  it('should return early if no config in validateOptions (line 105)', () => {
    expect(() => {
      ConfigurationValidator.validateOptions(
        'unknown' as ModelRunnerProvider,
        {}
      );
    }).not.toThrow();
  });

  it('should get provider config (line 125)', () => {
    const config = ConfigurationValidator.getProviderConfig('cloudflare');
    expect(config).toBeDefined();
    expect(config?.requiredEnvVars).toContain('AI');
  });

  it('should return undefined for unknown provider (line 125)', () => {
    const config = ConfigurationValidator.getProviderConfig(
      'unknown' as ModelRunnerProvider
    );
    expect(config).toBeUndefined();
  });

  it('should validate temperature - invalid type (lines 110-112)', () => {
    expect(() => {
      ConfigurationValidator.validateOptions('cloudflare', {
        temperature: 'invalid',
      });
    }).toThrow('Temperature must be a number between 0 and 2');
  });

  it('should validate temperature - below 0 (lines 110-112)', () => {
    expect(() => {
      ConfigurationValidator.validateOptions('cloudflare', {
        temperature: -0.5,
      });
    }).toThrow('Temperature must be a number between 0 and 2');
  });

  it('should validate temperature - above 2 (lines 110-112)', () => {
    expect(() => {
      ConfigurationValidator.validateOptions('cloudflare', {
        temperature: 2.5,
      });
    }).toThrow('Temperature must be a number between 0 and 2');
  });

  it('should validate max_tokens - invalid type (lines 117-120)', () => {
    expect(() => {
      ConfigurationValidator.validateOptions('cloudflare', {
        max_tokens: 'invalid',
      });
    }).toThrow('Max tokens must be a positive number');
  });

  it('should validate max_tokens - zero or negative (lines 117-120)', () => {
    expect(() => {
      ConfigurationValidator.validateOptions('cloudflare', { max_tokens: 0 });
    }).toThrow('Max tokens must be a positive number');
  });
});

describe(RuntimeConfigManager.name, () => {
  beforeEach(() => {
    RuntimeConfigManager.updateConfig({
      timeout: 30000,
      retries: { maxAttempts: 3, baseDelay: 1000, maxDelay: 10000 },
      caching: { enabled: false, ttl: 300000 },
      logging: { enabled: true, level: 'info' },
    });
  });

  it('should update config (line 170)', () => {
    RuntimeConfigManager.updateConfig({ timeout: 60000 });
    const config = RuntimeConfigManager.getConfig();
    expect(config.timeout).toBe(60000);
  });

  it('should deep merge nested objects (lines 173-185)', () => {
    RuntimeConfigManager.updateConfig({
      retries: { maxAttempts: 5, baseDelay: 1000, maxDelay: 10000 },
    });
    const config = RuntimeConfigManager.getConfig();
    expect(config.retries?.maxAttempts).toBe(5);
    expect(config.retries?.baseDelay).toBe(1000);
    expect(config.retries?.maxDelay).toBe(10000);
  });

  it('should handle multiple nested updates (lines 173-185)', () => {
    RuntimeConfigManager.updateConfig({
      caching: { enabled: true, ttl: 600000 },
      logging: { enabled: true, level: 'debug' },
    });
    const config = RuntimeConfigManager.getConfig();
    expect(config.caching?.enabled).toBe(true);
    expect(config.caching?.ttl).toBe(600000);
    expect(config.logging?.level).toBe('debug');
    expect(config.logging?.enabled).toBe(true);
  });

  it('should handle multiple nested updates (lines 173-185)', () => {
    RuntimeConfigManager.updateConfig({
      caching: { enabled: true, ttl: 600000 },
      logging: { enabled: true, level: 'debug' },
    });
    const config = RuntimeConfigManager.getConfig();
    expect(config.caching?.enabled).toBe(true);
    expect(config.caching?.ttl).toBe(600000);
    expect(config.logging?.level).toBe('debug');
    expect(config.logging?.enabled).toBe(true);
  });
});
