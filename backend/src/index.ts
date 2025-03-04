import { Hono } from 'hono'
import { extractController, generateController, debugController } from './controllers'

const app = new Hono()

app.post('/api/debug', debugController)
app.post('/api/generate', generateController)
app.post('/api/extract', extractController)

export default {
  port: 8000,
  fetch: app.fetch, 
};