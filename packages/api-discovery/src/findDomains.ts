import { Database } from "./common"

export interface DomainRecord {
  name: string
  type: string
  notNull: boolean
  comment: string
}

export default async function findDomains(db: Database): Promise<DomainRecord[]> {
  return await db.manyOrNone<DomainRecord>(`
    select typ.typname "name", tt.typname "type", typ.typnotnull "notNull",
        obj_description(typ.typname::regtype) comment
      from pg_catalog.pg_type typ
    inner join pg_catalog.pg_namespace nsp on nsp.oid = typ.typnamespace
    inner join pg_catalog.pg_type tt on typ.typbasetype = tt.oid
      left join pg_catalog.pg_constraint con on con.contypid = typ.oid
    where nsp.nspname = 'public'
      and typ.typtype = 'd'
  `)
}