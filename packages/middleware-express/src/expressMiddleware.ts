import type { ApiTransport } from "@grimo/metadata"
import type { Request, Response, NextFunction } from "express"

/** Provides access to the database API as an Express middleware. */
export function expressMiddleware(api: ApiTransport) {
  return async function apiRequest(req: Request, res: Response, next: NextFunction) {
    const route = req.method.toUpperCase() + req.path.toLowerCase()
    switch (route) {
      case "GET /select": {
        const query = JSON.parse(req.query.query as string)
        const result = await api.select(query)
        res.json(result)
        next()
        break
      }
      case "POST /insert": {
        const query = JSON.parse(await readBody(req))
        const result = await api.insert(query)
        res.json(result)
        next()
        break
      }
      case "PATCH /update": {
        const query = JSON.parse(await readBody(req))
        const result = await api.update(query)
        res.json(result)
        next()
        break
      }
      case "DELETE /delete": {
        const query = JSON.parse(await readBody(req))
        const result = await api.delete(query)
        res.json(result)
        next()
        break
      }
      case "POST /call": {
        const query = JSON.parse(await readBody(req))
        const result = await api.call(query)
        res.json(result)
        next()
        break
      }
      default: {
        console.warn("no match", route)
        res.status(404)
        next(new Error("No matching route."))
      }
    }
  }
}

function readBody(req: Request): Promise<string> {
  return new Promise(resolve => {
    let data = ""
    req.socket.on("data", chunk => data += chunk)
    req.socket.on("end", () => resolve(data))
  })
}