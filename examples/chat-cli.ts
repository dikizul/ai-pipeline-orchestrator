/**
 * Interactive Chat CLI - Live chatbot with multi-turn conversations
 *
 * This example demonstrates:
 * - Multi-turn conversation history
 * - Real-time streaming responses
 * - All handlers working together
 * - Interactive user experience
 *
 * SETUP: Configure environment variables in .env file
 *
 * Simple setup:
 *   echo "AI_PROVIDER=anthropic" > .env
 *   echo "AI_MODEL=claude-3-5-haiku-20241022" >> .env
 *   echo "ANTHROPIC_API_KEY=your-key" >> .env
 *
 * Run:
 *   npx tsx examples/chat-cli.ts
 */
import 'dotenv/config'
import * as readline from 'readline'
import {
  executeOrchestration,
  IntentClassifier,
  ContextOptimizer,
  createModerationHandler,
  createIntentHandler,
  createContextHandler,
  createStreamingAIHandler,
  type OrchestrationContext,
  type Message,
} from '../src'

const intentClassifier = new IntentClassifier({
  patterns: [
    { category: 'greeting', keywords: ['hello', 'hi', 'hey', 'greetings'] },
    { category: 'help', keywords: ['help', 'support', 'assist'] },
    { category: 'goodbye', keywords: ['bye', 'goodbye', 'exit', 'quit'] },
  ],
  metadata: {
    tones: {
      greeting: 'Be warm and welcoming',
      help: 'Be helpful and patient',
      goodbye: 'Be friendly and wish them well',
    },
  },
})

const contextOptimizer = new ContextOptimizer({
  sections: [
    {
      id: 'core',
      name: 'Core Instructions',
      content: 'You are a helpful AI assistant. Be concise, friendly, and conversational.',
      alwaysInclude: true,
    },
    {
      id: 'greeting',
      name: 'Greeting Guide',
      content: 'Welcome users warmly and ask how you can help.',
      topics: ['greeting'],
    },
    {
      id: 'help',
      name: 'Help Guide',
      content: 'Provide clear, actionable help and guidance.',
      topics: ['help'],
    },
  ],
  strategy: {
    firstMessage: 'full',
    followUp: 'selective',
  },
})

async function chat() {
  const aiProvider = process.env.AI_PROVIDER as 'anthropic' | 'openai' | 'deepseek' | 'ollama'
  const aiModel = process.env.AI_MODEL

  if (!aiProvider || !aiModel) {
    console.error('❌ Error: AI_PROVIDER and AI_MODEL are required\n')
    console.log('Quick setup:')
    console.log('  cp .env.example .env')
    console.log('  # Edit .env with your provider and model\n')
    console.log('Provider options: anthropic, openai, deepseek, ollama')
    console.log('Model examples:')
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
        console.error('❌ Error: ANTHROPIC_API_KEY is required')
        process.exit(1)
      }
    } else if (provider === 'openai') {
      apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        console.error('❌ Error: OPENAI_API_KEY is required')
        process.exit(1)
      }
    } else if (provider === 'deepseek') {
      apiKey = process.env.DEEPSEEK_API_KEY
      if (!apiKey) {
        console.error('❌ Error: DEEPSEEK_API_KEY is required')
        process.exit(1)
      }
    } else if (provider === 'ollama') {
      baseURL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
    }

    return { apiKey, baseURL }
  }

  const aiConfig = getProviderConfig(aiProvider)

  const messages: Message[] = []

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  console.log('\n🤖 AI Chat CLI')
  console.log('━'.repeat(50))
  console.log(`Provider: ${aiProvider} | Model: ${aiModel}`)
  console.log('Type "exit" or "quit" to end the conversation\n')

  const prompt = () => {
    rl.question('You: ', async (input) => {
      const userMessage = input.trim()

      if (!userMessage) {
        prompt()
        return
      }

      if (userMessage.toLowerCase() === 'exit' || userMessage.toLowerCase() === 'quit') {
        console.log('\n👋 Goodbye!\n')
        rl.close()
        return
      }

      messages.push({ role: 'user', content: userMessage })

      const context: OrchestrationContext = {
        request: {
          messages: [...messages],
          metadata: { userId: 'cli-user' },
        },
      }

      process.stdout.write('\nAssistant: ')

      try {
        const result = await executeOrchestration(context, [
          {
            name: 'moderation',
            handler: createModerationHandler({
              spamPatterns: ['buy now', 'click here'],
            }),
          },
          {
            name: 'intent',
            handler: createIntentHandler({
              classifier: intentClassifier,
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
            name: 'streaming-ai',
            handler: createStreamingAIHandler({
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
              onChunk: (chunk) => {
                process.stdout.write(chunk)
              },
            }),
          },
        ])

        if (result.success) {
          const aiResponse = result.context.aiResponse as { text?: string }
          if (aiResponse?.text) {
            messages.push({ role: 'assistant', content: aiResponse.text })
          }
          console.log('\n')
        } else {
          console.error(`\n\n❌ Error: ${result.error?.message}\n`)
        }
      } catch (error) {
        console.error(`\n\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
      }

      prompt()
    })
  }

  prompt()
}

chat().catch(console.error)
