import { z } from 'zod';

export const CreateRunBodySchema = z.object({
  idea: z.string().trim().min(1).max(8000),
});
