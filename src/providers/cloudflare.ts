import { AiModels } from '@cloudflare/workers-types';
import { ModelRunnerConfig } from '../types';

export const cloudflareAIModel = (
  model: keyof AiModels
): ModelRunnerConfig => ({
  provider: 'cloudflare',
  model,
});
