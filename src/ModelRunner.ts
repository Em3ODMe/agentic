import type {
  ModelProvider,
  ModelRunnerEnvironment,
  ModelRunnerProvider,
  ModelRunnerResult,
  ModelRunnerRunParams,
} from './types';
import { ProviderFactory } from './providers/ProviderFactory';
import { ResponseBuilder } from './response/ResponseBuilder';
import {
  ConfigurationValidator,
  RuntimeConfigManager,
} from './config/Configuration';
import { RetryHandler, ErrorHandler } from './errors/RetryHandler';
import { ConfigurationError } from './types';

export class ModelRunner {
  private environment: ModelRunnerEnvironment<unknown>;

  constructor(environment: ModelRunnerEnvironment<unknown>) {
    this.environment = environment;
  }

  async run<T>({
    messages,
    model,
    jsonMode = false,
    options = {},
  }: ModelRunnerRunParams): Promise<ModelRunnerResult<T>> {
    const { provider, model: modelName } = model;

    try {
      // Validate inputs
      this.validateInputs(provider, modelName, options);

      // Create provider instance
      const providerInstance = ProviderFactory.createProvider(
        provider,
        this.environment
      );

      // Validate provider capabilities
      this.validateCapabilities(providerInstance, jsonMode, options);

      // Execute with retry logic
      const response = await RetryHandler.executeWithRetry(
        () =>
          providerInstance.execute({
            messages,
            jsonMode,
            options,
            model: modelName,
          }),
        RuntimeConfigManager.getConfig().retries,
        `ModelRunner execution with ${provider}`
      );

      // Build and return result
      return ResponseBuilder.create<T>()
        .setContent(response.content)
        .setToolCalls(response.toolCalls)
        .setRawResponse(response.raw)
        .setUsage(response.usage)
        .setJsonMode(jsonMode)
        .build();
    } catch (error) {
      throw ErrorHandler.wrapProviderError(error, provider, 'ModelRunner.run');
    }
  }

  /**
   * Get supported providers
   */
  static getSupportedProviders(): string[] {
    return ProviderFactory.getSupportedProviders();
  }

  /**
   * Check if a provider supports specific features
   */
  static getProviderCapabilities(provider: ModelRunnerProvider):
    | {
        jsonMode: boolean;
        tools: boolean;
        streaming: boolean;
      }
    | undefined {
    const config = ConfigurationValidator.getProviderConfig(provider);
    return config?.supportedFeatures;
  }

  /**
   * Update runtime configuration
   */
  static updateRuntimeConfig(
    config: Partial<Parameters<typeof RuntimeConfigManager.updateConfig>[0]>
  ): void {
    RuntimeConfigManager.updateConfig(config);
  }

  /**
   * Validate inputs before processing
   */
  private validateInputs(
    provider: ModelRunnerProvider,
    model: string,
    options: Record<string, unknown>
  ): void {
    ConfigurationValidator.validateProvider(provider, this.environment);
    ConfigurationValidator.validateModel(provider, model);
    ConfigurationValidator.validateOptions(provider, options);
  }

  /**
   * Validate that the provider supports the requested features
   */
  private validateCapabilities(
    provider: ModelProvider,
    jsonMode: boolean,
    options: Record<string, unknown>
  ): void {
    if (jsonMode && !provider.supportsJsonMode()) {
      throw new ConfigurationError(
        `Provider ${provider.providerType} does not support JSON mode`,
        provider.providerType
      );
    }

    if (options?.tools && !provider.supportsTools()) {
      throw new ConfigurationError(
        `Provider ${provider.providerType} does not support tools`,
        provider.providerType
      );
    }
  }
}
