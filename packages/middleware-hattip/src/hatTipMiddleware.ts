import type { ApiTransport } from "@grimo/metadata"
import type { RequestContext } from "@hattip/compose"

/** Provides access to the database API as a HatTip middleware. */
export function hatTipMiddleware(api: ApiTransport) {
  const headers = { "Content-Type": "application/json" }

  return async function apiRequest(context: RequestContext) {
    const url = new URL(context.url)
    const route = context.method.toUpperCase() + " " + url.pathname
    switch (route) {
      case "GET /select": {
        const query = JSON.parse(url.search)
        const result = await api.select(query)
        return new Response(JSON.stringify(result), { headers })
      }
      case "POST /insert": {
        const query = await context.request.json()
        const result = await api.insert(query)
        return new Response(JSON.stringify(result), { headers })
      }
      case "PATCH /update": {
        const query = await context.request.json()
        const result = await api.update(query)
        return new Response(JSON.stringify(result), { headers })
      }
      case "DELETE /delete": {
        const query = await context.request.json()
        const result = await api.delete(query)
        return new Response(JSON.stringify(result), { headers })
      }
      case "POST /call": {
        const query = await context.request.json()
        const result = await api.call(query)
        return new Response(JSON.stringify(result), { headers })
      }
      default: {
        console.warn("no match", route)
        return new Response(null, {
          status: 404,
          statusText: "No matching route.",
        })
      }
    }
  }
}