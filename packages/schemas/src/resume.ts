import { z } from 'zod'

// Body the client sends when the user approves or rejects the stories
export const ResumeRunBodySchema = z.object({
  approved: z.boolean(),
})

export type ResumeRunBody = z.infer<typeof ResumeRunBodySchema>
