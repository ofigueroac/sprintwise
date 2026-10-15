import { ChatGoogleGenerativeAI } from '@langchain/google-genai'

// Each model id has its own free-tier daily quota so a 429 can fall through
const MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
] as const

function createChat(apiKey: string, model: (typeof MODELS)[number]) {
  return new ChatGoogleGenerativeAI({
    apiKey,
    model,
    temperature: 0.3,
  })
}

export function createGeminiModel(apiKey: string) {
  const chats = MODELS.map((model) => createChat(apiKey, model))
  const primary = chats[0]
  const fallbacks = chats.slice(1)
  if (!primary) {
    throw new Error('Gemini model list is empty')
  }

  const chain = primary.withFallbacks({ fallbacks })

  return Object.assign(chain, {
    bindTools(...args: Parameters<ChatGoogleGenerativeAI['bindTools']>) {
      const bound = chats.map((chat) => chat.bindTools(...args))
      const nextPrimary = bound[0]
      const nextFallbacks = bound.slice(1)
      if (!nextPrimary) {
        throw new Error('Gemini model list is empty')
      }
      return nextPrimary.withFallbacks({ fallbacks: nextFallbacks })
    },
  })
}
