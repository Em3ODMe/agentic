import type { ModelProvider, ModelRunnerEnvironment } from '../types';
import { CloudflareProvider } from './CloudflareProvider';
import { GroqProvider } from './GroqProvider';
import { ConfigurationError } from '../types';

export class ProviderFactory {
  private static providers = new Map<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (environment: ModelRunnerEnvironment<any>) => ModelProvider
  >([
    ['cloudflare', CloudflareProvider],
    ['groq', GroqProvider],
  ]);

  static createProvider(
    providerType: string,
    environment: ModelRunnerEnvironment<unknown>
  ): ModelProvider {
    const ProviderClass = this.providers.get(providerType);

    if (!ProviderClass) {
      throw new ConfigurationError(
        `Unknown provider: ${providerType}. Supported providers: ${Array.from(this.providers.keys()).join(', ')}`,
        providerType
      );
    }

    return new ProviderClass(environment);
  }

  static getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  static registerProvider(
    providerType: string,
    providerClass: new (
      environment: ModelRunnerEnvironment<unknown>
    ) => ModelProvider
  ): void {
    this.providers.set(providerType, providerClass);
  }

  static isProviderSupported(providerType: string): boolean {
    return this.providers.has(providerType);
  }
}
