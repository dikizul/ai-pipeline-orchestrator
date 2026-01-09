# ai-pipeline-orchestrator

**Build production-ready AI chatbots and agents with composable pipelines.**

This framework solves common AI application challenges: intent detection, context management, token optimization, rate limiting, and moderation. Compose handlers into sequential pipelines that process requests step-by-step with full type safety.

## Why Use This?

**Problem:** Building AI chatbots involves repetitive boilerplate - validating input, detecting intent, loading context, calling LLMs, handling errors. Copy-pasting this across routes leads to inconsistent behavior and maintenance headaches.

**Solution:** `ai-pipeline-orchestrator` provides battle-tested handlers you compose into pipelines. Each handler does one thing well. Your pipeline executes steps sequentially with automatic error handling and performance monitoring.

**Benefits:**
- 🚀 Get from idea to production chatbot in minutes, not days
- 💰 Reduce token costs 30-50% with smart context optimization
- 🔒 Built-in safety with rate limiting and content moderation
- 🎯 Hybrid intent detection: fast keyword matching with LLM fallback
- 📊 Full observability with structured logging and performance tracking
- 🔧 TypeScript-first with full type safety and IntelliSense

## Features

- **Sequential Orchestration** - Map-based handler system with error propagation and performance monitoring
- **Hybrid Intent Classification** - Fast keyword matching (free) with optional LLM fallback (accurate)
- **Dynamic Context Optimization** - Smart context loading based on topics/intent (30-50% token reduction)
- **Multi-Provider Support** - Works with Anthropic (Claude), OpenAI (GPT), or Ollama (local models)
- **Essential Handlers** - Rate limiting, content moderation, intent detection, context building, AI generation
- **Extensible** - Easy to add custom handlers and extend functionality
- **TypeScript First** - Full type safety and IntelliSense support
- **Minimal Dependencies** - Only Zod required, AI SDK is optional

## Use Cases

Perfect for:
- **Customer support chatbots** - Intent routing, context-aware responses, rate limiting
- **AI assistants** - Multi-step workflows with error handling and observability
- **Conversational agents** - Smart context loading to minimize token costs
- **Internal tools** - Quick prototypes that need production-ready patterns

## Installation

```bash
npm install ai-pipeline-orchestrator
```

For AI generation, install a provider:

```bash
# Anthropic (Claude) - Recommended
npm install @ai-sdk/anthropic ai

# Or OpenAI (GPT)
npm install @ai-sdk/openai ai

# Or Ollama (Local models)
npm install ollama-ai-provider ai
```

## Provider Configuration

The package supports multiple LLM providers for intent classification and AI generation:

### Anthropic (Claude)

```typescript
import { LLMIntentClassifier, createAIHandler } from 'ai-pipeline-orchestrator'

const classifier = new LLMIntentClassifier({
  provider: 'anthropic',
  model: 'claude-3-5-haiku-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY,
  categories: ['greeting', 'help'],
  categoryDescriptions: { greeting: 'User says hello', help: 'User needs help' },
})

const aiHandler = createAIHandler({
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY,
})
```

### OpenAI (GPT)

```typescript
const classifier = new LLMIntentClassifier({
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY,
  categories: ['greeting', 'help'],
  categoryDescriptions: { greeting: 'User says hello', help: 'User needs help' },
})

const aiHandler = createAIHandler({
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
})
```

### Ollama (Local Models)

```typescript
const classifier = new LLMIntentClassifier({
  provider: 'ollama',
  model: 'llama3.2',
  baseURL: 'http://localhost:11434', // Optional, this is the default
  categories: ['greeting', 'help'],
  categoryDescriptions: { greeting: 'User says hello', help: 'User needs help' },
})

const aiHandler = createAIHandler({
  provider: 'ollama',
  model: 'llama3.2',
  baseURL: 'http://localhost:11434', // Optional, this is the default
})
```

## Quick Start

Here's a minimal chatbot in ~30 lines (works with Anthropic, OpenAI, or Ollama):

```typescript
import {
  executeOrchestration,
  createAIHandler,
  type OrchestrationContext,
} from 'ai-pipeline-orchestrator'

const context: OrchestrationContext = {
  request: {
    messages: [{ role: 'user', content: 'Tell me a joke' }],
  },
}

const result = await executeOrchestration(context, [
  {
    name: 'ai',
    handler: createAIHandler({
      provider: 'anthropic', // or 'openai' or 'ollama'
      model: 'claude-3-5-haiku-20241022',
      apiKey: process.env.ANTHROPIC_API_KEY,
      getSystemPrompt: () => 'You are a helpful assistant.',
    }),
  },
])

if (result.success) {
  console.log(result.context.aiResponse.text)
}
```

That's it! For production use, add moderation, intent detection, and context optimization (see examples below).

## Core Concepts

### Orchestration Pipeline

The orchestration pipeline executes handlers sequentially, passing context between them:

```typescript
const result = await executeOrchestration(
  context,
  [
    { name: 'step1', handler: handler1 },
    { name: 'step2', handler: handler2 },
  ],
  {
    logger: myLogger,
    onStepComplete: (step, duration) => {
      console.log(`${step} completed in ${duration}ms`)
    },
  }
)
```

Pipeline stops immediately if any handler sets `context.error` or throws.

## Handler Configuration Guide

All available handlers with complete configuration examples:

### Content Moderation

Filter spam and profanity:

```typescript
import { createModerationHandler } from 'ai-pipeline-orchestrator'

const moderationHandler = createModerationHandler({
  spamPatterns: ['buy now', 'click here', 'limited time'],
  customRules: [
    {
      pattern: /\b(badword1|badword2)\b/i,
      reason: 'Contains prohibited content',
    },
  ],
})
```

### Rate Limiting

Implement custom rate limiting:

```typescript
import { createRateLimitHandler, type RateLimiter } from 'ai-pipeline-orchestrator'

// Create your own rate limiter (e.g., using Upstash, Redis, etc.)
const rateLimiter: RateLimiter = {
  check: async (identifier) => {
    // Your rate limiting logic
    const allowed = await checkRateLimit(identifier)
    return {
      allowed,
      retryAfter: allowed ? undefined : 60, // seconds
    }
  },
}

const rateLimitHandler = createRateLimitHandler({
  limiter: rateLimiter,
  identifierKey: 'userId', // Which context field to use as identifier
})
```

### Intent Detection

Hybrid approach combining keyword matching with optional LLM fallback:

**Keyword-based (fast, free):**

```typescript
import { IntentClassifier, createIntentHandler } from 'ai-pipeline-orchestrator'

const classifier = new IntentClassifier({
  patterns: [
    { category: 'greeting', keywords: ['hello', 'hi', 'hey'] },
    { category: 'help', keywords: ['help', 'support', 'assist'] },
  ],
  metadata: {
    tones: { greeting: 'friendly', help: 'helpful' },
    requiresAuth: ['admin_action'],
  },
})

const intentHandler = createIntentHandler({ classifier })
```

**LLM-based (accurate, requires API):**

```typescript
import { LLMIntentClassifier } from 'ai-pipeline-orchestrator'

const llmClassifier = new LLMIntentClassifier({
  provider: 'anthropic',
  model: 'claude-3-5-haiku-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY,
  categories: ['greeting', 'help', 'question'],
  categoryDescriptions: {
    greeting: 'User says hello',
    help: 'User needs help',
    question: 'User asks a question',
  },
})
```

**Hybrid (keyword first, LLM fallback):**

```typescript
const intentHandler = createIntentHandler({
  classifier, // keyword classifier
  llmFallback: {
    enabled: true,
    classifier: llmClassifier,
    confidenceThreshold: 0.5, // Use LLM if keyword confidence < 0.5
  },
})
```

### Context Building

Smart context selection based on topics and message position:

```typescript
import { ContextOptimizer, createContextHandler } from 'ai-pipeline-orchestrator'

const optimizer = new ContextOptimizer({
  sections: [
    {
      id: 'core',
      name: 'Core Instructions',
      content: 'You are a helpful assistant.',
      alwaysInclude: true, // Always include this section
    },
    {
      id: 'help',
      name: 'Help Guide',
      content: 'Help documentation...',
      topics: ['help', 'support'], // Include when intent matches these topics
    },
    {
      id: 'pricing',
      name: 'Pricing Info',
      content: 'Pricing details...',
      topics: ['pricing', 'cost'],
    },
  ],
  strategy: {
    firstMessage: 'full',      // Load all sections for first message
    followUp: 'selective',     // Load only relevant sections for follow-ups
  },
})

const contextHandler = createContextHandler({
  optimizer,
  getTopics: (context) => {
    const intent = context.intent as { intent?: string }
    return intent?.intent ? [intent.intent] : []
  },
})
```

### AI Generation

Non-streaming generation:

```typescript
import { createAIHandler } from 'ai-pipeline-orchestrator'

const aiHandler = createAIHandler({
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY,
  temperature: 0.7,
  maxTokens: 1024,
  getSystemPrompt: (context) => {
    // Build dynamic system prompt from context
    const promptContext = context.promptContext as { systemPrompt?: string }
    return promptContext?.systemPrompt || 'You are a helpful assistant.'
  },
})
```

Streaming generation:

```typescript
import { createStreamingAIHandler } from 'ai-pipeline-orchestrator'

const streamingHandler = createStreamingAIHandler({
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY,
  onChunk: (chunk) => {
    // Send to client via SSE, WebSocket, etc.
    sendToClient(chunk)
  },
})
```

### Custom Handlers

Create your own handlers for specific business logic:

```typescript
import { OrchestrationHandler } from 'ai-pipeline-orchestrator'

const authHandler: OrchestrationHandler = async (context) => {
  const userId = context.request.metadata?.userId

  if (!userId) {
    return {
      ...context,
      error: {
        message: 'Authentication required',
        statusCode: 401,
        step: 'auth',
      },
    }
  }

  return {
    ...context,
    user: await fetchUser(userId),
  }
}
```

## Complete Example with AI Generation

End-to-end pipeline from user input to AI response:

```typescript
import {
  executeOrchestration,
  IntentClassifier,
  ContextOptimizer,
  createModerationHandler,
  createIntentHandler,
  createContextHandler,
  createAIHandler,
} from 'ai-pipeline-orchestrator'

// Setup handlers (see Handler Configuration Guide for full details)
const intentClassifier = new IntentClassifier({
  patterns: [
    { category: 'greeting', keywords: ['hello', 'hi', 'hey'] },
    { category: 'help', keywords: ['help', 'support'] },
  ],
})

const contextOptimizer = new ContextOptimizer({
  sections: [
    { id: 'core', content: 'You are a helpful assistant.', alwaysInclude: true },
    { id: 'help', content: 'Help guide...', topics: ['help'] },
  ],
})

// Execute pipeline
const context = {
  request: {
    messages: [{ role: 'user', content: 'Hello!' }],
  },
}

const result = await executeOrchestration(context, [
  { name: 'moderation', handler: createModerationHandler() },
  { name: 'intent', handler: createIntentHandler({ classifier: intentClassifier }) },
  { name: 'context', handler: createContextHandler({ optimizer: contextOptimizer }) },
  {
    name: 'ai',
    handler: createAIHandler({
      provider: 'anthropic',
      model: 'claude-3-5-haiku-20241022',
      apiKey: process.env.ANTHROPIC_API_KEY,
    }),
  },
])

if (result.success) {
  console.log('AI Response:', result.context.aiResponse.text)
}
```

## Streaming Support

For real-time response delivery, use `createStreamingAIHandler`:

```typescript
import {
  executeOrchestration,
  createStreamingAIHandler,
} from 'ai-pipeline-orchestrator'

const result = await executeOrchestration(context, [
  {
    name: 'streaming-ai',
    handler: createStreamingAIHandler({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      apiKey: process.env.ANTHROPIC_API_KEY,
      onChunk: (chunk) => {
        // Send chunk to client (SSE, WebSocket, etc.)
        process.stdout.write(chunk)
      },
    }),
  },
])

// Full response is still available after streaming completes
if (result.success) {
  const response = result.context.aiResponse as { text: string; usage: any }
  console.log('Full text:', response.text)
  console.log('Tokens used:', response.usage.totalTokens)
}
```

**Note:** The streaming handler collects all chunks and provides the full text in `result.context.aiResponse` after completion.

## Examples

See the `examples/` directory for complete working examples:

- **[`basic-chatbot.ts`](./examples/basic-chatbot.ts)** - Simple pipeline without AI (moderation + intent + context)
- **[`complete-chatbot.ts`](./examples/complete-chatbot.ts)** - End-to-end with AI generation
- **[`streaming-chatbot.ts`](./examples/streaming-chatbot.ts)** - Real-time streaming responses
- **[`all-handlers.ts`](./examples/all-handlers.ts)** - Production pipeline using ALL handlers (rate limiting, moderation, intent, context, AI)

### Running Examples

All examples support multiple AI providers. Configure via `.env` file:

**Basic Setup (same provider for all tasks):**
```bash
cp .env.example .env
# Edit .env and set:
# AI_PROVIDER=anthropic
# AI_MODEL=claude-3-5-haiku-20241022
# ANTHROPIC_API_KEY=your-key

npx tsx examples/streaming-chatbot.ts
```

**Advanced Setup (different providers for intent vs AI):**

Use a cheaper/faster model for intent classification and a more capable model for responses:

```bash
# Edit .env:
# AI_PROVIDER=anthropic
# AI_MODEL=claude-3-5-sonnet-20241022
# INTENT_PROVIDER=openai
# INTENT_MODEL=gpt-4o-mini
# ANTHROPIC_API_KEY=your-anthropic-key
# OPENAI_API_KEY=your-openai-key

npx tsx examples/all-handlers.ts
```

**Supported Providers:**
- **Anthropic (Claude):** `AI_PROVIDER=anthropic` - Get key at [console.anthropic.com](https://console.anthropic.com)
- **OpenAI (GPT):** `AI_PROVIDER=openai` - Get key at [platform.openai.com](https://platform.openai.com)
- **Ollama (Local):** `AI_PROVIDER=ollama` - Free, runs locally. Get at [ollama.com](https://ollama.com)

**Environment Variables:**
- `AI_PROVIDER` - Main AI provider (required)
- `AI_MODEL` - Main AI model (required)
- `INTENT_PROVIDER` - Intent classifier provider (optional, defaults to AI_PROVIDER)
- `INTENT_MODEL` - Intent classifier model (optional, defaults to AI_MODEL)
- `ANTHROPIC_API_KEY` - Required if using Anthropic
- `OPENAI_API_KEY` - Required if using OpenAI
- `OLLAMA_BASE_URL` - Optional for Ollama (defaults to http://localhost:11434)

## API Reference

### Core Orchestration

**`executeOrchestration(context, steps, config?)`**
Execute the orchestration pipeline. Returns `{ success: boolean, context, error? }`.

**`Orchestrator`**
Class-based orchestrator for stateful pipeline management.

**Types:**

- `OrchestrationContext` - Context object passed between handlers
- `OrchestrationHandler` - Handler function type: `(context) => Promise<context>`
- `OrchestrationStep` - Pipeline step with name and handler

### Intent Detection

**`IntentClassifier`**
Keyword-based intent detection. Fast and free.

**`LLMIntentClassifier`**
LLM-based intent classification. More accurate, requires API calls.

**`createIntentHandler(config)`**
Creates handler that combines keyword + optional LLM fallback.

### Context Management

**`ContextOptimizer`**
Smart context selection to reduce token usage by 30-50%.

**`createContextHandler(config)`**
Creates handler that builds system prompts based on detected intent/topics.

### AI Generation

**`createAIHandler(config)`**
Creates handler for text generation (non-streaming).

**`createStreamingAIHandler(config)`**
Creates handler for streaming text generation with real-time chunks.

### Utilities

**`createRateLimitHandler(config)`**
Rate limiting with custom limiter implementation.

**`createModerationHandler(config)`**
Content filtering for spam and profanity.

## License

MIT
