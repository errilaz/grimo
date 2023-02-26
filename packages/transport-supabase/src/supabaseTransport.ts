import { ApiTransport, SelectQuery, InsertCommand, UpdateCommand, DeleteCommand, CallCommand } from "@grimo/metadata"
import type { SupabaseClient } from "@supabase/supabase-js"

export class SupabaseTransport implements ApiTransport {
  private client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async select(select: SelectQuery) {
    let query = this.client.from(select.table)
      .select(...(select.selected ?? []))
    if (select.conditions) for (const condition of select.conditions) {
      switch (condition.operator) {
        case "is null":
          query = query.is(condition.column, null)
          break
        case "is not null":
          query = query.not(condition.column, "is", null)
          break
        case "<":
          query = query.lt(condition.column, condition.value)
          break
        case ">":
          query = query.gt(condition.column, condition.value)
          break
        case "<=":
          query = query.lte(condition.column, condition.value)
          break
        case ">=":
          query = query.gte(condition.column, condition.value)
          break
      }
    }
    if (select.limit !== undefined && select.offset !== undefined) {
      query = query.range(select.offset, select.offset + select.limit - 1)
    }
    else if (select.limit !== undefined) {
      query = query.limit(select.limit)
    }
    else if (select.offset !== undefined) {
      throw new Error("Supabase doesn't support `offset` without `limit`? Lol, lmao.")
    }
    if (select.orderBy && select.orderBy.columns.length === 1) {
      query = query.order(select.orderBy.columns[0], {
        ascending: select.orderBy.direction === "asc"
      })
    }
    else if (select.orderBy) {
      throw new Error("Supabase doesn't support multiple `order by` columns? Lol, lmao.")
    }
    const results = await query;
    return results.data || []
  }

  async insert(insert: InsertCommand): Promise<any[]> {
    throw new Error("Not implemented.")
  }

  async update(update: UpdateCommand): Promise<any[]> {
    throw new Error("Not implemented.")
  }

  async delete(del: DeleteCommand): Promise<any[]> {
    throw new Error("Not implemented.")
  }

  async call(call: CallCommand): Promise<any> {
    throw new Error("Not implemented.")
  }
}