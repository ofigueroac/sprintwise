import { AIMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseCheckpointSaver } from '@langchain/langgraph';
import {
  END,
  START,
  StateGraph,
  MessagesAnnotation,
} from '@langchain/langgraph';

import { ANALYST_SYSTEM_PROMPT } from '../prompts/analyst';

export function createAnalystGraph(
  model: BaseChatModel,
  checkpointer?: BaseCheckpointSaver
) {
  const analyst = async (state: typeof MessagesAnnotation.State) => {
    const stream = await model.stream([
      new SystemMessage(ANALYST_SYSTEM_PROMPT),
      ...state.messages,
    ]);
    let response;
    for await (const chunk of stream) {
      response = response ? response.concat(chunk) : chunk;
    }

    return { messages: [response ?? new AIMessage('')] };
  };

  return new StateGraph(MessagesAnnotation)
    .addNode('analyst', analyst)
    .addEdge(START, 'analyst')
    .addEdge('analyst', END)
    .compile({ checkpointer });
}
