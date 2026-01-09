/**
 * All Handlers Example - Complete production pipeline
 *
 * This example demonstrates all available handlers working together:
 * - Rate limiting
 * - Content moderation
 * - Intent detection (keyword + LLM fallback)
 * - Context optimization
 * - AI generation
 */
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

// 4. LLM Fallback Classifier (optional, requires API key)
const llmClassifier = new LLMIntentClassifier({
  provider: 'anthropic',
  model: 'claude-3-5-haiku-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY,
  categories: ['greeting', 'help', 'pricing', 'technical', 'general'],
  categoryDescriptions: {
    greeting: 'User is greeting or saying hello',
    help: 'User needs help or has a question',
    pricing: 'User is asking about pricing or costs',
    technical: 'User has a technical issue or bug report',
    general: 'General conversation or unclear intent',
  },
})

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
          provider: 'anthropic',
          model: 'claude-3-5-haiku-20241022',
          apiKey: process.env.ANTHROPIC_API_KEY,
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
