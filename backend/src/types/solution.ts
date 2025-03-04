import { z } from 'zod'

export const SolutionSchema = z.object({
  code: z.string(),
  thoughts: z.array(z.string()),
  time_complexity: z.string(),
  space_complexity: z.string()
})

export type Solution = z.infer<typeof SolutionSchema>
