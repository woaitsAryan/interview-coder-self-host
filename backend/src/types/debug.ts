import { z } from "zod";
import { ProblemInfoSchema } from "./problem-info";

export const DebugInputSchema = z.object({
  imageDataList: z.array(z.string()),
  problemInfo: z.object({
    problemInfo: ProblemInfoSchema,
  }),
  language: z.string()
})

export const DebugOutputSchema = z.object({
  new_code: z.string(),
  thoughts: z.array(z.string()),
  time_complexity: z.string(),
  space_complexity: z.string()
})
