import { EnumData } from "@grimo/metadata"
import { Database, snakeToPascal } from "./common"

/** Collect metadata about database enums. */
export default async function findEnums(db: Database): Promise<EnumData[]> {
  return (await db.manyOrNone<{
    name: string
    order: number
    enum_name: string
  }>(`
      select e.enumlabel "name", e.enumsortorder "order", t.typname "enum_name"
        from pg_enum e
        join pg_type t
          on e.enumtypid = t.oid
         and t.typnamespace in (
          select oid
          from pg_namespace
          where nspname = 'public'
        )
    `)).reduce((enums, { name, order, enum_name }) => {
    let enu = enums.find(e => e.name === enum_name)
    if (!enu) {
      enu = { name: enum_name, apiName: snakeToPascal(enum_name), fields: [] }
      enums.push(enu)
    }
    enu.fields.push({ name, order })
    return enums
  }, [] as EnumData[])
}
