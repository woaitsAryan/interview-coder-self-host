import { Context } from "hono";
import { zodResponseFormat } from "openai/helpers/zod";
import { SolutionSchema } from "../types/solution";
import openai from "../configs/openai";

export async function generateController(c: Context) {
  const body = await c.req.json()

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that generates a problem statement based on a given language and a problem type."
      }
      ,
      {
        role: "user",
        content: [
          { type: "text", text: "Here is the problem statement: " + JSON.stringify(body) },
        ]
      }
    ],
    response_format: zodResponseFormat(SolutionSchema, "solution")
  })

  const extractedSolution = JSON.parse(response.choices[0].message.content as any)

  return c.json({
    success: true,
    ...extractedSolution
  })
}