import { Context } from "hono";
import { GenerateInput, GenerateInputSchema } from "../types/problem-info";
import { anthropic } from "../configs/claude";
import { SolutionSchema } from "../types/solution";

export async function generateController(c: Context) {
  const body = await c.req.json()

  const { language, problemInfo } = GenerateInputSchema.parse(body)

  const answer = await generateSolution({ language, problemInfo })
  return c.json({
    success: true,
    ...answer
  });
}

async function generateSolution(data: GenerateInput) {
  const { language, problemInfo } = data

  const prompt = `
  You are a helpful assistant that can help me solve a coding problem.
  Here is the problem statement:
  ${JSON.stringify(problemInfo)}
  Generate a solution for the problem in ${language} language.
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
            code: {
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
          required: ["code", "thoughts", "time_complexity", "space_complexity"]
        }
      }
    ],
    tool_choice: { type: "tool", name: "solution" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt }
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

  const answer = SolutionSchema.parse(toolResponse.input)

  return answer
}

