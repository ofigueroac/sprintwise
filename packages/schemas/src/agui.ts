import { z } from 'zod';

import {
  RunStartedEventSchema,
  TextMessageStartEventSchema,
  TextMessageContentEventSchema,
  TextMessageEndEventSchema,
  ToolCallStartEventSchema,
  ToolCallArgsEventSchema,
  ToolCallEndEventSchema,
  RunFinishedEventSchema,
  RunErrorEventSchema,
} from '@ag-ui/core/schemas';

//adds tool calls so the Kanban can mount from the stream
export const AgUiEventSchema = z.discriminatedUnion('type', [
  RunStartedEventSchema,
  TextMessageStartEventSchema,
  TextMessageContentEventSchema,
  TextMessageEndEventSchema,
  ToolCallStartEventSchema,
  ToolCallArgsEventSchema,
  ToolCallEndEventSchema,
  RunFinishedEventSchema,
  RunErrorEventSchema,
]);

export type AgUiEvent = z.infer<typeof AgUiEventSchema>;
