import { Context } from "hono";
import { DebugInputSchema, DebugOutputSchema } from "../types/debug";
import { anthropic } from "../configs/claude";
import { SolutionSchema } from "../types/solution";

export async function debugController(c: Context) {
  const body = await c.req.json()

  const { imageDataList, problemInfo, language } = DebugInputSchema.parse(body)

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
          { type: "text", text: "Here is the problem statement: " + JSON.stringify(problemInfo.problemInfo) },
          { type: "text", text: "Generate the solution in " + language + " language. The current solution I have written isn't working. Here is the image of it" },
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

  return c.json({
    success: true,
    ...answer
  })
}