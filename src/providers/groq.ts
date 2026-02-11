import type { ModelRunnerConfig } from '../types';

type GroqModelsList =
  | 'llama-3.1-8b-instant'
  | 'llama-3.3-70b-versatile'
  | 'meta-llama/llama-guard-4-12b'
  | 'openai/gpt-oss-120b'
  | 'openai/gpt-oss-20b'
  | 'whisper-large-v3'
  | 'whisper-large-v3-turbo';

export const groqAIModel = (model: GroqModelsList): ModelRunnerConfig => ({
  provider: 'groq',
  model,
});
