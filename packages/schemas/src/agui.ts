import { z } from 'zod';

import {
  RunStartedEventSchema,
  TextMessageStartEventSchema,
  TextMessageContentEventSchema,
  TextMessageEndEventSchema,
  RunFinishedEventSchema,
  RunErrorEventSchema,
} from '@ag-ui/core/schemas';

//types of message on the stream for AG-UI events
export const AgUiEventSchema = z.discriminatedUnion('type', [
  RunStartedEventSchema,
  TextMessageStartEventSchema,
  TextMessageContentEventSchema,
  TextMessageEndEventSchema,
  RunFinishedEventSchema,
  RunErrorEventSchema,
]);

export type AgUiEvent = z.infer<typeof AgUiEventSchema>;
