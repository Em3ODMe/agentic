import type { ModelRunnerEnvironment, ModelRunnerProvider } from '../types';

export interface ProviderConfigSchema {
  requiredEnvVars: string[];
  optionalEnvVars: string[];
  defaultOptions: Record<string, unknown>;
  supportedFeatures: {
    jsonMode: boolean;
    tools: boolean;
    streaming: boolean;
  };
  modelValidation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  };
}

export interface RuntimeConfig {
  timeout?: number;
  retries?: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
  };
  caching?: {
    enabled: boolean;
    ttl: number;
  };
  logging?: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
  };
}

export class ConfigurationValidator {
  private static providerConfigs: Map<
    ModelRunnerProvider,
    ProviderConfigSchema
  > = new Map([
    [
      'cloudflare',
      {
        requiredEnvVars: ['AI'],
        optionalEnvVars: [],
        defaultOptions: {},
        supportedFeatures: {
          jsonMode: true,
          tools: true,
          streaming: false,
        },
      },
    ],
    [
      'groq',
      {
        requiredEnvVars: ['GROQ_API_KEY'],
        optionalEnvVars: [],
        defaultOptions: {
          temperature: 0.7,
          max_tokens: 1024,
        },
        supportedFeatures: {
          jsonMode: true,
          tools: true,
          streaming: true,
        },
      },
    ],
  ]);

  static validateProvider(
    provider: ModelRunnerProvider,
    environment: ModelRunnerEnvironment<unknown>
  ): void {
    const config = this.providerConfigs.get(provider);
    if (!config) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    this.validateEnvironmentVariables(provider, config, environment);
  }

  static validateModel(provider: ModelRunnerProvider, model: string): void {
    const config = this.providerConfigs.get(provider);
    if (!config || !config.modelValidation) {
      return;
    }

    const validation = config.modelValidation;

    if (validation.minLength && model.length < validation.minLength) {
      throw new Error(
        `Model name must be at least ${validation.minLength} characters long`
      );
    }

    if (validation.maxLength && model.length > validation.maxLength) {
      throw new Error(
        `Model name must not exceed ${validation.maxLength} characters`
      );
    }

    if (validation.pattern && !validation.pattern.test(model)) {
      throw new Error(
        `Model name does not match required pattern: ${validation.pattern}`
      );
    }
  }

  static validateOptions(
    provider: ModelRunnerProvider,
    options: Record<string, unknown>
  ): void {
    const config = this.providerConfigs.get(provider);
    if (!config) {
      return;
    }

    // Validate known options
    if ('temperature' in options) {
      const temp = options.temperature;
      if (typeof temp !== 'number' || temp < 0 || temp > 2) {
        throw new Error('Temperature must be a number between 0 and 2');
      }
    }

    if ('max_tokens' in options) {
      const tokens = options.max_tokens;
      if (typeof tokens !== 'number' || tokens <= 0) {
        throw new Error('Max tokens must be a positive number');
      }
    }
  }

  static getProviderConfig(
    provider: ModelRunnerProvider
  ): ProviderConfigSchema | undefined {
    return this.providerConfigs.get(provider);
  }

  static registerProviderConfig(
    provider: ModelRunnerProvider,
    config: ProviderConfigSchema
  ): void {
    this.providerConfigs.set(provider, config);
  }

  private static validateEnvironmentVariables(
    provider: ModelRunnerProvider,
    config: ProviderConfigSchema,
    environment: ModelRunnerEnvironment<unknown>
  ): void {
    const missing = config.requiredEnvVars.filter((key) => !environment[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables for ${provider}: ${missing.join(', ')}`
      );
    }
  }
}

export class RuntimeConfigManager {
  private static defaultConfig: RuntimeConfig = {
    timeout: 30000,
    retries: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
    },
    caching: {
      enabled: false,
      ttl: 300000, // 5 minutes
    },
    logging: {
      enabled: true,
      level: 'info',
    },
  };

  static getConfig(): RuntimeConfig {
    return { ...this.defaultConfig };
  }

  static updateConfig(updates: Partial<RuntimeConfig>): void {
    this.defaultConfig = this.deepMerge(this.defaultConfig, updates);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }
}
