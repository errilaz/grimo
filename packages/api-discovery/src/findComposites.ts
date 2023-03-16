import { Database } from "./common"

export interface CompositeRecord {
  name: string
  attributes: AttributeRecord[]
}

export interface AttributeRecord {
  name: string
  order: number
  type: string
  udt: string | null
  nullable: boolean
}

/** Collect metadata about composite user-defined types. */
export default async function findComposites(db: Database): Promise<CompositeRecord[]> {
  const composites = await db.manyOrNone<{ name: string }>(`
    select i.user_defined_type_name "name"
      from information_schema.user_defined_types i
     where i.user_defined_type_schema = 'public'
  `)
  return Promise.all(composites.map(async ({ name }) => ({
    name,
    attributes: await db.manyOrNone<AttributeRecord>(`
      select i.attribute_name "name", i.ordinal_position "order",
             i.is_nullable = 'YES' "nullable", i.data_type "type",
             i.attribute_udt_name "udt"
        from information_schema.attributes i
       where i.udt_schema = 'public'
         and i.udt_name = '${name}'
    `)
  })))
}
