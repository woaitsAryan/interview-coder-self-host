import openai from "../configs/openai"
import { zodResponseFormat } from "openai/helpers/zod";
import { ProblemInfoSchema } from "../types/problem-info";
import type { Context } from "hono";

export async function extractController(c: Context) {
  const body = await c.req.json()

  const imageDataList = body.imageDataList
  const language = body.language

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "You are a helpful assistant that extracts problem information from a given image. The language to solve the problem is " + language + "." },
          ...imageDataList.map((imageData: string) => ({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageData}` } }))
        ]
      }
    ],
    response_format: zodResponseFormat(ProblemInfoSchema, "problem_info")
  })

  const extractedProblemInfo = JSON.parse(response.choices[0].message.content as any)

  return c.json({
    problemInfo: extractedProblemInfo,
    success: true
  })
}
