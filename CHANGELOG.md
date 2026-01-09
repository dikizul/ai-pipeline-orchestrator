# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Enhanced chat-cli to showcase ALL framework features
  - Content moderation with spam detection
  - In-memory rate limiting (10 requests/minute)
  - Hybrid intent classification (keyword → LLM fallback at 0.5 confidence)
  - Dynamic context optimization with 6 sections (greeting, help, questions, feedback, goodbye)
  - Real-time streaming responses
  - Comprehensive pipeline results display
- **Separate Intent Provider**: Chat demo now supports using different provider/model for intent classification
  - Use `INTENT_PROVIDER` and `INTENT_MODEL` to override defaults
  - Example: Use GPT-4o-mini for classification, Claude Sonnet for chat
  - Defaults to `AI_PROVIDER`/`AI_MODEL` if not specified
  - Enables cost optimization (cheaper model for classification, premium for chat)
- Token usage tracking for LLM intent classification
- Method indicator (`keyword` vs `llm`) for intent classification results
- Detailed token breakdown showing classification vs chat response usage
- Context optimizer now includes `totalSections` in result for savings calculation
- Enhanced README with quick-start demo instructions (30 seconds to running)
- Comprehensive .env.example with quick start guide and provider recommendations
- Rich terminal UI with:
  - Feature checklist showing active handlers
  - Pipeline results breakdown (moderation, rate limit, intent, context, AI)
  - Token savings visualization
  - Example queries to try

### Changed
- Chat CLI header now displays all active features and their descriptions
- Metadata display reorganized to show value of each pipeline handler
- Intent classifier expanded to 5 categories (greeting, help, goodbye, question, feedback)
- Context sections now include feature demonstrations and framework information

### Fixed
- LLM classifier now properly captures and returns usage data
- Context optimization savings calculation now shows percentage and sections skipped

## [0.1.0] - 2026-01-09

### Added
- Initial release
- Sequential orchestration pipeline with error propagation
- Hybrid intent classification (keyword + LLM fallback)
- Dynamic context optimization for 30-50% token reduction
- Multi-provider support (Anthropic, OpenAI, DeepSeek, Ollama)
- Content moderation handler
- Rate limiting handler (bring your own limiter)
- Intent detection handler
- Context building handler
- AI generation handler (streaming and non-streaming)
- TypeScript-first with full type safety
- Comprehensive examples and documentation
