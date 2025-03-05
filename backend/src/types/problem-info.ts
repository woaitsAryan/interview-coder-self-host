import { z } from 'zod'

export const ProblemInfoSchema = z.object({
  title: z.string().optional(),                
  description: z.string(),
  constraints: z.string().optional(),          
  examples: z.array(z.object({              
    input: z.string(),                
    output: z.string(),               
    explanation: z.string().optional(),        
  })).optional(),
  problemType: z.string().optional(),           
  difficulty: z.string().optional(),            
  sourceUrl: z.string().optional(),            
  codeSnippets: z.array(z.object({ 
    language: z.string(),             
    code: z.string(),                 
  })).optional(),
})


export const GenerateInputSchema = z.object({
  language: z.string(),
  problemInfo: ProblemInfoSchema,
})

export const ExtractInputSchema = z.object({
  imageDataList: z.array(z.string()),
  language: z.string(),
})

export type GenerateInput = z.infer<typeof GenerateInputSchema>
export type ProblemInfo = z.infer<typeof ProblemInfoSchema>
export type ExtractInput = z.infer<typeof ExtractInputSchema>
