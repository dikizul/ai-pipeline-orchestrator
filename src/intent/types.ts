export interface IntentPattern {
  category: string
  keywords: string[]
}

export interface IntentConfig {
  patterns: IntentPattern[]
  metadata?: {
    deepLinks?: Record<string, string>
    tones?: Record<string, string>
    requiresAuth?: string[]
    [key: string]: unknown
  }
}

export interface IntentResult {
  intent: string
  confidence: number
  matchedKeywords?: string[]
  metadata?: Record<string, unknown>
}
