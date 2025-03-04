import { Context } from "hono";

export async function debugController(c: Context) {
  const body = await c.req.json()
  
  throw new Error('Not implemented')

  return c.json({
    success: true,
    ...body
  })
}