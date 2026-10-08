import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

const MODEL = 'gemini-3.8-flash';
export function createGeminiModel(apiKey: string) {
  return new ChatGoogleGenerativeAI({
    apiKey,
    model: MODEL,
    temperature: 0.3,
  });
}
