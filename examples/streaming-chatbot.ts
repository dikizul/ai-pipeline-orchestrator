/**
 * Example: Streaming chatbot with real-time response delivery
 *
 * SETUP: Choose your provider and configure environment variables
 *
 * Anthropic (Claude):
 *   echo "AI_PROVIDER=anthropic" > .env
 *   echo "ANTHROPIC_API_KEY=your-key" >> .env
 *   echo "AI_MODEL=claude-3-5-haiku-20241022" >> .env
 *
 * OpenAI (GPT):
 *   echo "AI_PROVIDER=openai" > .env
 *   echo "OPENAI_API_KEY=your-key" >> .env
 *   echo "AI_MODEL=gpt-4o-mini" >> .env
 *
 * Ollama (Local):
 *   echo "AI_PROVIDER=ollama" > .env
 *   echo "AI_MODEL=llama3.2" >> .env
 *   echo "OLLAMA_BASE_URL=http://localhost:11434" >> .env
 */
import 'dotenv/config'
import {
  executeOrchestration,
  createModerationHandler,
  createStreamingAIHandler,
  type OrchestrationContext,
} from '../src'

async function main() {
  const provider = process.env.AI_PROVIDER as 'anthropic' | 'openai' | 'ollama'
  const model = process.env.AI_MODEL

  if (!provider) {
    console.error('❌ Error: AI_PROVIDER is required\n')
    console.log('Choose a provider and add to .env file:\n')
    console.log('Anthropic: AI_PROVIDER=anthropic')
    console.log('OpenAI:    AI_PROVIDER=openai')
    console.log('Ollama:    AI_PROVIDER=ollama\n')
    process.exit(1)
  }

  if (!model) {
    console.error('❌ Error: AI_MODEL is required\n')
    console.log('Add to .env file based on your provider:\n')
    console.log('Anthropic: AI_MODEL=claude-3-5-haiku-20241022')
    console.log('OpenAI:    AI_MODEL=gpt-4o-mini')
    console.log('Ollama:    AI_MODEL=llama3.2\n')
    process.exit(1)
  }

  let apiKey: string | undefined
  let baseURL: string | undefined

  if (provider === 'anthropic') {
    apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('❌ Error: ANTHROPIC_API_KEY is required for Anthropic provider')
      console.log('Add to .env file: ANTHROPIC_API_KEY=your-key\n')
      process.exit(1)
    }
  } else if (provider === 'openai') {
    apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('❌ Error: OPENAI_API_KEY is required for OpenAI provider')
      console.log('Add to .env file: OPENAI_API_KEY=your-key\n')
      process.exit(1)
    }
  } else if (provider === 'ollama') {
    baseURL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  }

  const context: OrchestrationContext = {
    request: {
      messages: [
        { role: 'user', content: 'Tell me a story about a robot' },
      ],
    },
  }

  const result = await executeOrchestration(context, [
    {
      name: 'moderation',
      handler: createModerationHandler({
        spamPatterns: ['buy now', 'click here'],
      }),
    },
    {
      name: 'streaming-ai',
      handler: createStreamingAIHandler({
        provider,
        model,
        apiKey,
        baseURL,
        getSystemPrompt: () => 'You are a creative storyteller. Keep your story brief (2-3 sentences).',
        onChunk: (chunk) => {
          process.stdout.write(chunk)
        },
      }),
    },
  ])

  if (result.success) {
    console.log('\n\n--- Streaming complete ---')
    const aiResponse = result.context.aiResponse as { text?: string; usage?: any }
    console.log('Full text length:', aiResponse?.text?.length || 0, 'characters')
    console.log('Usage:', aiResponse?.usage)
  } else {
    console.error('Error:', result.error)
  }
}

main().catch(console.error)
