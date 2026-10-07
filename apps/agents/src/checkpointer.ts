import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

// LangGraph remembers a conversation in Postgres
export function createCheckpointer(databaseUrl: string) {
  return PostgresSaver.fromConnString(databaseUrl);
}
