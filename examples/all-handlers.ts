/**
 * All Handlers Example - Complete production pipeline
 *
 * This example demonstrates all available handlers working together:
 * - Rate limiting
 * - Content moderation
 * - Intent detection (keyword + LLM fallback)
 * - Context optimization
 * - AI generation
 *
 * SETUP: Configure environment variables in .env file
 *
 * Simple (same provider for intent and AI):
 *   echo "AI_PROVIDER=anthropic" > .env
 *   echo "AI_MODEL=claude-3-5-haiku-20241022" >> .env
 *   echo "ANTHROPIC_API_KEY=your-key" >> .env
 *
 * Advanced (different providers for intent vs AI):
 *   echo "AI_PROVIDER=anthropic" > .env
 *   echo "AI_MODEL=claude-3-5-sonnet-20241022" >> .env
 *   echo "INTENT_PROVIDER=openai" >> .env
 *   echo "INTENT_MODEL=gpt-4o-mini" >> .env
 *   echo "ANTHROPIC_API_KEY=your-anthropic-key" >> .env
 *   echo "OPENAI_API_KEY=your-openai-key" >> .env
 */
import 'dotenv/config'
import {
  executeOrchestration,
  IntentClassifier,
  LLMIntentClassifier,
  ContextOptimizer,
  createRateLimitHandler,
  createModerationHandler,
  createIntentHandler,
  createContextHandler,
  createAIHandler,
  type OrchestrationContext,
  type RateLimiter,
} from '../src'

// 1. Rate Limiter - Simple in-memory implementation (use Redis/Upstash in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

const rateLimiter: RateLimiter = {
  check: async (identifier: string) => {
    const now = Date.now()
    const limit = 5 // 5 requests per minute
    const window = 60 * 1000 // 1 minute

    const current = rateLimitStore.get(identifier)

    if (!current || now > current.resetAt) {
      rateLimitStore.set(identifier, { count: 1, resetAt: now + window })
      return { allowed: true }
    }

    if (current.count >= limit) {
      const retryAfter = Math.ceil((current.resetAt - now) / 1000)
      return { allowed: false, retryAfter }
    }

    current.count++
    return { allowed: true }
  },
}

// 2. Content Moderation
const moderationHandler = createModerationHandler({
  spamPatterns: ['buy now', 'click here', 'limited time offer'],
  customRules: [
    {
      pattern: /\b(spam|scam)\b/i,
      reason: 'Potential spam content',
    },
  ],
})

// 3. Intent Classification - Keyword-based
const intentClassifier = new IntentClassifier({
  patterns: [
    { category: 'greeting', keywords: ['hello', 'hi', 'hey', 'greetings'] },
    { category: 'help', keywords: ['help', 'support', 'assist', 'question'] },
    { category: 'pricing', keywords: ['price', 'cost', 'pricing', 'payment'] },
    { category: 'technical', keywords: ['bug', 'error', 'not working', 'broken'] },
  ],
  metadata: {
    tones: {
      greeting: 'Be warm and welcoming',
      help: 'Be helpful and patient',
      pricing: 'Be clear about pricing',
      technical: 'Be technical and solution-oriented',
    },
  },
})

// 4. LLM Fallback Classifier (configured in main based on provider)

// 5. Context Optimizer
const contextOptimizer = new ContextOptimizer({
  sections: [
    {
      id: 'core',
      name: 'Core Instructions',
      content: 'You are a helpful customer support assistant. Be concise and friendly.',
      alwaysInclude: true,
    },
    {
      id: 'greeting-guide',
      name: 'Greeting Guide',
      content: 'Welcome users warmly. Ask how you can help them today.',
      topics: ['greeting'],
    },
    {
      id: 'help-guide',
      name: 'Help Guide',
      content: 'Available resources: documentation, tutorials, support tickets.',
      topics: ['help'],
    },
    {
      id: 'pricing-info',
      name: 'Pricing Information',
      content: 'Plans: Free ($0/mo), Pro ($29/mo), Enterprise (custom pricing).',
      topics: ['pricing'],
    },
    {
      id: 'technical-guide',
      name: 'Technical Support Guide',
      content: 'Common issues: Check logs, restart service, contact support if persists.',
      topics: ['technical'],
    },
  ],
  strategy: {
    firstMessage: 'full',
    followUp: 'selective',
  },
})

async function main() {
  const aiProvider = process.env.AI_PROVIDER as 'anthropic' | 'openai' | 'deepseek' | 'ollama'
  const aiModel = process.env.AI_MODEL
  const intentProvider = (process.env.INTENT_PROVIDER ?? aiProvider) as 'anthropic' | 'openai' | 'deepseek' | 'ollama'
  const intentModel = process.env.INTENT_MODEL ?? aiModel

  if (!aiProvider) {
    console.error('❌ Error: AI_PROVIDER is required\n')
    console.log('Add to .env file: AI_PROVIDER=anthropic|openai|deepseek|ollama\n')
    process.exit(1)
  }

  if (!aiModel) {
    console.error('❌ Error: AI_MODEL is required\n')
    console.log('Add to .env file with your chosen model:\n')
    console.log('  AI_MODEL=your-model-name\n')
    console.log('Examples by provider:')
    console.log('  Anthropic: claude-3-5-haiku-20241022, claude-3-5-sonnet-20241022')
    console.log('  OpenAI:    gpt-4o-mini, gpt-4o')
    console.log('  DeepSeek:  deepseek-chat (cloud API)')
    console.log('  Ollama:    Run "ollama list" to see your installed models\n')
    process.exit(1)
  }

  const getProviderConfig = (provider: 'anthropic' | 'openai' | 'deepseek' | 'ollama') => {
    let apiKey: string | undefined
    let baseURL: string | undefined

    if (provider === 'anthropic') {
      apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        console.error(`❌ Error: ANTHROPIC_API_KEY is required for Anthropic provider`)
        console.log('Add to .env file: ANTHROPIC_API_KEY=your-key\n')
        process.exit(1)
      }
    } else if (provider === 'openai') {
      apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        console.error(`❌ Error: OPENAI_API_KEY is required for OpenAI provider`)
        console.log('Add to .env file: OPENAI_API_KEY=your-key\n')
        process.exit(1)
      }
    } else if (provider === 'deepseek') {
      apiKey = process.env.DEEPSEEK_API_KEY
      if (!apiKey) {
        console.error(`❌ Error: DEEPSEEK_API_KEY is required for DeepSeek provider`)
        console.log('Add to .env file: DEEPSEEK_API_KEY=your-key\n')
        process.exit(1)
      }
    } else if (provider === 'ollama') {
      baseURL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
    }

    return { apiKey, baseURL }
  }

  const aiConfig = getProviderConfig(aiProvider)
  const intentConfig = getProviderConfig(intentProvider)

  const llmClassifier = new LLMIntentClassifier({
    provider: intentProvider,
    model: intentModel as string,
    apiKey: intentConfig.apiKey,
    baseURL: intentConfig.baseURL,
    categories: ['greeting', 'help', 'pricing', 'technical', 'general'],
    categoryDescriptions: {
      greeting: 'User is greeting or saying hello',
      help: 'User needs help or has a question',
      pricing: 'User is asking about pricing or costs',
      technical: 'User has a technical issue or bug report',
      general: 'General conversation or unclear intent',
    },
  })

  const context: OrchestrationContext = {
    request: {
      messages: [
        {
          role: 'user',
          content: 'Hi! I need help with a bug in my app',
        },
      ],
      metadata: {
        userId: 'user-123', // For rate limiting
      },
    },
  }

  console.log('Executing full production pipeline...\n')

  const result = await executeOrchestration(
    context,
    [
      {
        name: 'rate-limit',
        handler: createRateLimitHandler({
          limiter: rateLimiter,
          identifierKey: 'userId',
        }),
      },
      {
        name: 'moderation',
        handler: moderationHandler,
      },
      {
        name: 'intent',
        handler: createIntentHandler({
          classifier: intentClassifier,
          llmFallback: {
            enabled: true,
            classifier: llmClassifier,
            confidenceThreshold: 0.5,
          },
        }),
      },
      {
        name: 'context',
        handler: createContextHandler({
          optimizer: contextOptimizer,
          getTopics: (ctx) => {
            const intent = ctx.intent as { intent?: string }
            return intent?.intent ? [intent.intent] : []
          },
        }),
      },
      {
        name: 'ai',
        handler: createAIHandler({
          provider: aiProvider,
          model: aiModel as string,
          apiKey: aiConfig.apiKey,
          baseURL: aiConfig.baseURL,
          temperature: 0.7,
          maxTokens: 1024,
          getSystemPrompt: (ctx) => {
            const promptContext = ctx.promptContext as { systemPrompt?: string }
            const intent = ctx.intent as { metadata?: { tone?: string } }

            let systemPrompt = promptContext?.systemPrompt || ''

            if (intent?.metadata?.tone) {
              systemPrompt += `\n\nTone: ${intent.metadata.tone}`
            }

            return systemPrompt
          },
        }),
      },
    ],
    {
      onStepComplete: (step, duration) => {
        console.log(`✓ ${step} completed in ${duration}ms`)
      },
    }
  )

  console.log('\n=== Results ===\n')

  if (result.success) {
    console.log('Intent:', result.context.intent)
    console.log('\nContext sections included:', (result.context.promptContext as any)?.sectionsIncluded)
    console.log('\nAI Response:', (result.context.aiResponse as any)?.text)
    console.log('\nToken usage:', (result.context.aiResponse as any)?.usage)
  } else {
    console.error('Error:', result.error)
  }
}

main().catch(console.error)
