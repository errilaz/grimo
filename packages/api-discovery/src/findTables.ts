import { Database } from "./common"
import { AttributeRecord, CompositeRecord } from "./findComposites"

/** Collect metadata about tables. */
export default async function findTables(db: Database): Promise<CompositeRecord[]> {
  const tables = await db.manyOrNone<{ name: string }>(`
    select table_name "name"
      from information_schema.tables
     where table_schema = 'public'
       and table_type = 'BASE TABLE'
  `)
  return Promise.all(tables.map(async ({ name }) => ({
    name,
    attributes: await findColumns(db, name),
  })))
}

export async function findColumns(db: Database, table: string) {
  return await db.manyOrNone<AttributeRecord>(`
    select i.column_name "name", i.ordinal_position "order",
            i.is_nullable = 'YES' "nullable", i.data_type "type",
            i.udt_name "udt"
      from information_schema.columns i
      where i.table_schema = 'public'
        and i.table_name = '${table}'
  `)
}
