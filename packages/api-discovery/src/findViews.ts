import { Database } from "./common"
import { CompositeRecord } from "./findComposites"
import { findColumns } from "./findTables"

export interface ViewRecord extends CompositeRecord {
  updatable: boolean
  insertable: boolean
}

/** Collect metadata about tables. */
export default async function findViews(db: Database): Promise<ViewRecord[]> {
  const views = await db.manyOrNone<ViewRecord>(`
    select table_name "name", is_updatable "updatable", is_insertable_into "insertable"
      from information_schema.views
     where table_schema = 'public'
  `)
  return Promise.all(views.map(async ({ name, updatable, insertable }) => ({
    name,
    updatable,
    insertable,
    attributes: await findColumns(db, name),
  })))
}