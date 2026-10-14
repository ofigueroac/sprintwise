import { z } from 'zod';

// Body the client sends when it asks the agent to start a run
export const CreateRunBodySchema = z.object({
  idea: z.string().trim().min(1).max(8000),
});
