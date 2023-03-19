import type { SelectQuery, DbFormatter, BinaryCondition, Condition, OrderBySort } from "@grimo/metadata"
import CodeBuilder from "@grimo/code-builder"

export type SqlGenerator = ReturnType<typeof sqlGenerator>
/** Generates Postgres statements from representations created by the API. */
export default function sqlGenerator(format: DbFormatter) {
  return {
    select,
  }

  function select({ selected, table, conditions, limit, offset, orderBy }: SelectQuery) {
    if (conditions?.length === 0) conditions = undefined
    const sq = new CodeBuilder()
    return sq
      .push(`select `)
      .when(selected, selected => {
        sq.push(selected!.map(format.name).join(`, `))
      })
      .when(!selected, `*`)
      .line()
      .line(`from ${format.name(table)}`)
      .when(conditions, conditions => {
        sq.pipe(whereClause(conditions))
      })
      .when(limit, limit => {
        sq.line(`limit ${format.number(limit)}`)
      })
      .when(offset, offset => {
        sq.line(`offset ${format.number(offset)}`)
      })
      .when(orderBy, orderBy => {
        sq.pipe(orderByClause(orderBy))
      })
      .toString()
  }

  function whereClause(conditions: Condition[]) {
    return (sq: CodeBuilder) => sq
      .push(`where `)
      .indent()
      .each(conditions, (cond, c) => {
        sq.when(c > 0, ` and `)
          .push(`${format.name(cond.column)} `)
          .push(cond.operator)
          .when(cond.arity === 2, ` ${format.text((cond as BinaryCondition).value)}`)
          .line()
      })
      .dedent()
  }

  function orderByClause(orderBy: OrderBySort[]) {
    return (sq: CodeBuilder) => sq
      .push(`order by `)
      .indent()
      .each(orderBy, ({ column, direction }, s) => {
        sq.when(s > 0, `, `)
          .push(`${format.name(column)} ${direction}`)
          .line()
      })
      .dedent()
  }
}
