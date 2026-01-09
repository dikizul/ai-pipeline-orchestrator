export type AIProvider = 'anthropic' | 'openai' | 'deepseek' | 'ollama'

export interface ProviderConfig {
  provider: AIProvider
  model: string
  apiKey?: string
  baseURL?: string
}

/**
 * Creates an AI model instance from the specified provider.
 */
export async function createModel(config: ProviderConfig): Promise<any> {
  if (config.provider === 'anthropic') {
    const { createAnthropic } = await import('@ai-sdk/anthropic')
    const anthropic = createAnthropic({ apiKey: config.apiKey })
    return anthropic(config.model)
  }

  if (config.provider === 'openai') {
    const { createOpenAI } = await import('@ai-sdk/openai')
    const openai = createOpenAI({ apiKey: config.apiKey })
    return openai(config.model)
  }

  if (config.provider === 'deepseek') {
    const { createOpenAI } = await import('@ai-sdk/openai')
    const deepseek = createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL ?? 'https://api.deepseek.com',
    })
    return deepseek(config.model)
  }

  if (config.provider === 'ollama') {
    const { createOllama } = await import('ollama-ai-provider')
    const ollama = createOllama({ baseURL: config.baseURL ?? 'http://localhost:11434' })
    return ollama(config.model)
  }

  throw new Error(`Unsupported provider: ${config.provider}`)
}
