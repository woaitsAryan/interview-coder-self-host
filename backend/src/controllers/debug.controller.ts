import { Context } from "hono";
import { DebugInput, DebugInputSchema, DebugOutputSchema } from "../types/debug";
import { anthropic } from "../configs/claude";

export async function debugController(c: Context) {
  const body = await c.req.json()

  const { imageDataList, problemInfo, language } = DebugInputSchema.parse(body)

  const answer = await generateDebuggingAnswer({ imageDataList, problemInfo, language })

  return c.json({
    success: true,
    ...answer
  })
}


async function generateDebuggingAnswer(data: DebugInput) {
  const { imageDataList, problemInfo, language } = data

  const prompt = `
  You are a helpful assistant that can help me debug my code.
  I have written a solution in ${language} to a coding problem, but it isn't working.
  Here is the problem statement:
  ${JSON.stringify(problemInfo.problemInfo)}
  I have attached an image of the code that isn't working.
  Please help me debug the code and provide a new solution that works.
  `

  const response = await anthropic.messages.create({
    model: "claude-3-7-sonnet-latest",
    max_tokens: 4096,
    tools: [
      {
        name: "solution",
        description: "Generate a solution for a coding problem",
        input_schema: {
          type: "object",
          properties: {
            new_code: {
              type: "string",
              description: "The solution code"
            },
            thoughts: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Thought process behind the solution"
            },
            time_complexity: {
              type: "string",
              description: "Time complexity of the solution"
            },
            space_complexity: {
              type: "string",
              description: "Space complexity of the solution"
            }
          },
          required: ["new_code", "thoughts", "time_complexity", "space_complexity"]
        }
      }
    ],
    tool_choice: { type: "tool", name: "solution" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...imageDataList.map((imageData: string) => ({
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: imageData
            }
          })) as any
        ]
      }
    ]
  });

  const toolResponse = response.content.find(
    content => content.type === "tool_use"
  );

  if (!toolResponse) {
    throw new Error("No tool response found")
  }

  const answer = DebugOutputSchema.parse(toolResponse.input)

  return answer
}
