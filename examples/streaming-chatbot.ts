import {
  executeOrchestration,
  createModerationHandler,
  createStreamingAIHandler,
  type OrchestrationContext,
} from '../src'

/**
 * Example: Streaming chatbot with real-time response delivery
 */
async function main() {
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
        provider: 'anthropic',
        model: 'claude-3-5-haiku-20241022',
        apiKey: process.env.ANTHROPIC_API_KEY,
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
