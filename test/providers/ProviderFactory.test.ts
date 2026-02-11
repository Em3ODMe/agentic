import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProviderFactory } from '@/providers/ProviderFactory';

describe(ProviderFactory.name, () => {
  const mockEnvironment = {
    AI: {
      run: vi.fn().mockResolvedValue({ response: 'Test response' }),
    },
    GROQ_API_KEY: 'test-key',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create cloudflare provider', () => {
    const provider = ProviderFactory.createProvider(
      'cloudflare',
      mockEnvironment
    );
    expect(provider.providerType).toBe('cloudflare');
  });

  it('should create groq provider', () => {
    const provider = ProviderFactory.createProvider('groq', mockEnvironment);
    expect(provider.providerType).toBe('groq');
  });

  it('should throw error for unknown provider', () => {
    expect(() => {
      ProviderFactory.createProvider('unknown', mockEnvironment);
    }).toThrow('Unknown provider: unknown');
  });

  it('should return list of supported providers', () => {
    const providers = ProviderFactory.getSupportedProviders();
    expect(providers).toContain('cloudflare');
    expect(providers).toContain('groq');
    expect(providers.length).toBe(2);
  });

  it('should register a new provider', () => {
    const mockProviderClass = vi.fn() as unknown as new (
      environment: typeof mockEnvironment
    ) => { providerType: string };

    ProviderFactory.registerProvider(
      'custom',
      mockProviderClass as unknown as Parameters<
        typeof ProviderFactory.registerProvider
      >[1]
    );

    expect(ProviderFactory.getSupportedProviders()).toContain('custom');
    expect(ProviderFactory.isProviderSupported('custom')).toBe(true);

    // Cleanup - remove the registered provider
    (
      ProviderFactory as unknown as { providers: Map<string, unknown> }
    ).providers.delete('custom');
  });

  it('should check if a provider is supported', () => {
    expect(ProviderFactory.isProviderSupported('cloudflare')).toBe(true);
    expect(ProviderFactory.isProviderSupported('groq')).toBe(true);
    expect(ProviderFactory.isProviderSupported('unknown')).toBe(false);
  });
});
