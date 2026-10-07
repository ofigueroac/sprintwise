import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

export function createGeminiModel(apiKey: string) {
  return new ChatGoogleGenerativeAI({
    apiKey,
    model: 'gemini-flash-latest',
    temperature: 0.3,
    streaming: true,
  });
}
