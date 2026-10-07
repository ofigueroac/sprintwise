import { SystemMessage } from '@langchain/core/messages';
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
    const response = await model.invoke([
      new SystemMessage(ANALYST_SYSTEM_PROMPT),
      ...state.messages,
    ]);

    return { messages: [response] };
  };

  return new StateGraph(MessagesAnnotation)
    .addNode('analyst', analyst)
    .addEdge(START, 'analyst')
    .addEdge('analyst', END)
    .compile({ checkpointer });
}
