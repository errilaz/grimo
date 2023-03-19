import { describe, it, expect } from "vitest"
import sqlGenerator from "../src/sqlGenerator"
import { SelectQuery } from "@grimo/metadata"
import pg from "pg-promise"

describe("SqlGenerator.select", () => {
  
  const sql = sqlGenerator(pg.as)

  it("should select * from table", () => {
    const output = sql.select({ table: "account" })
    
    expect(output).toBe(`select *\nfrom "account"\n`)
  })

  it("should select column from table", () => {
    const output = sql.select({
      table: "account",
      selected: ["id"],
    })

    expect(output).toBe(`select "id"\nfrom "account"\n`)
  })

  it("should select columns from table", () => {
    const output = sql.select({
      table: "account",
      selected: ["id", "name"],
    })

    expect(output).toBe(`select "id", "name"\nfrom "account"\n`)
  })

  it("should select with limit", () => {
    const output = sql.select({
      table: "account",
      selected: ["id"],
      limit: 5,
    })

    expect(output).toBe(`select "id"\nfrom "account"\nlimit 5\n`)
  })

})