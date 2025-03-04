import { z } from 'zod'

export const ProblemInfoSchema = z.object({
  // Problem details extracted from images
  title: z.string().optional(),                 // The title or name of the problem
  description: z.string(),           // The full problem description/statement
  constraints: z.string().optional(),           // Any constraints or limitations for the problem
  examples: z.array(z.object({              // Example test cases
    input: z.string(),                // Example input
    output: z.string(),               // Expected output
    explanation: z.string().optional(),         // Explanation of the example (if available)
  })).optional(),

  problemType: z.string().optional(),           // Type of problem (e.g., "algorithm", "data structure")
  difficulty: z.string().optional(),            // Difficulty level (e.g., "easy", "medium", "hard")
  sourceUrl: z.string().optional(),             // Original source of the problem if available

  codeSnippets: z.array(z.object({          // Any code snippets provided in the problem
    language: z.string(),             // Programming language of the snippet
    code: z.string(),                 // The code snippet itself
  })).optional(),

})

export type ProblemInfo = z.infer<typeof ProblemInfoSchema>
