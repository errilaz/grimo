import type { ApiTransport } from "@grimo/metadata"
import type { Context } from "koa"

/** Provides access to the database API as a Koa middleware. */
export function koaMiddleware(api: ApiTransport) {
  return async function apiRequest(context: Context) {
    const route = context.method.toUpperCase() + " " + context.path.toLowerCase()
    context.response.type = "application/json"
    context.response.status = 200
    switch (route) {
      case "GET /select": {
        const query = JSON.parse(context.query.query as string)
        const result = await api.select(query)
        context.response.body = JSON.stringify(result)
        break
      }
      case "POST /insert": {
        const query = JSON.parse(await readBody(context))
        const result = await api.insert(query)
        context.response.body = JSON.stringify(result)
        break
      }
      case "PATCH /update": {
        const query = JSON.parse(await readBody(context))
        const result = await api.update(query)
        context.response.body = JSON.stringify(result)
        break
      }
      case "DELETE /delete": {
        const query = JSON.parse(await readBody(context))
        const result = await api.delete(query)
        context.response.body = JSON.stringify(result)
        break
      }
      case "POST /call": {
        const query = JSON.parse(await readBody(context))
        const result = await api.call(query)
        context.response.body = JSON.stringify(result)
        break
      }
      default: {
        console.warn("no match", route)
        context.response.status = 404
      }
    }
  }
}

function readBody(context: Context): Promise<string> {
  return new Promise(resolve => {
    let data = ""
    context.request.socket.on("data", chunk => data += chunk)
    context.request.socket.on("end", () => resolve(data))
  })
}