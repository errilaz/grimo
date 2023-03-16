import { Database } from "./common"
import { AttributeRecord } from "./findComposites"

export interface FunctionRecord {
  name: string
  type: string
  udt: string | null
  parameters: AttributeRecord[]
}

/** Collect metadata about functions. */
export default async function findFunctions(db: Database): Promise<FunctionRecord[]> {
  const functions = await db.manyOrNone<{
    name: string, type: string, udt: string | null, specific_name: string
  }>(`
    select routine_name "name", data_type "type", udt_name "udt", specific_name
      from information_schema.routines
     where specific_schema = 'public'
  `)
  return Promise.all(functions.map(async ({ name, type, udt, specific_name }) => ({
    name,
    type,
    udt,
    parameters: await db.manyOrNone<AttributeRecord>(`
        select parameter_name "name", data_type "type", udt_name "udt", ordinal_position "order"
          from information_schema.parameters
         where specific_name = '${specific_name}'
      order by specific_name, ordinal_position asc
  `)
  })))
}