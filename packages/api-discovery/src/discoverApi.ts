import type { SchemaData, EnumData, TypeData, TableData, FuncData, ApiType, AttributeData } from "@grimo/metadata"
import { Database } from "./common"
import findComposites from "./findComposites"
import findEnums from "./findEnums"
import findFunctions from "./findFunctions"
import findTables from "./findTables"
import findViews from "./findViews"

/**
 * This is a rough first pass at the schema inspector.
 *    TODO: views
 *    TODO: represent foreign keys & primary keys
 *    TODO: better UDT detection
 */

/** Inspect a database and build the metadata necessary to generate the API. */
export default async function discover(db: Database, settings: Partial<DiscoverOptions> = {}): Promise<SchemaData> {
  const { verbose, udts }: DiscoverOptions = {
    verbose: !!settings.verbose,
    udts: {
      string: settings.udts?.string || [],
      number: settings.udts?.number || [],
    }
  }

  log("discovering enum types")
  const enums = await findEnums(db)
  log("enums", enums)

  log("discovering composite types")
  const composites = await findComposites(db)
  log("composite types", composites)

  log("discovering tables")
  const tables = await findTables(db)
  log("tables", tables)

  log("discovering views")
  const views = await findViews(db)
  log("views", views)

  log("discovering functions")
  const functions = await findFunctions(db)
  log("functions", functions)

  // const schema = { enums, types, tables, functions }

  log("resolving types")
  const resolved = resolveTypes(schema)
  log("resolutions", resolved)

  // log("resolving relationships")
  // const relationships = await resolveRelationships(db, schema)
  // log("relationships", relationships)

  process.exit()
  return {}

  function log(text: string, things?: { name: string }[]) {
    if (verbose) console.log(text + (!things ? "" : ": " + things?.map(t => t.name).join(", ")))
  }
}

export interface UdtOptions {
  string: string[]
  number: string[]
}

export interface DiscoverOptions {
  verbose: boolean
  // TODO: make inspector smart enough to obviate need for this
  udts: UdtOptions
}

const UNRESOLVED_UDT = "UNRESOLVED_UDT"

/** Collect metadata about user-defined types. */
function resolveTypes({ enums, types, tables, functions }: SchemaData) {
  let resolved = 0
  for (const type of types) {
    for (const attr of type.attributes) {
      resolved += resolveType(attr)
    }
  }
  for (const table of tables) {
    for (const column of table.columns) {
      resolved += resolveType(column)
    }
  }
  for (const func of functions) {
    for (const param of func.parameters) {
      resolved += resolveType(param)
    }
  }
  return resolved

  function resolveType(column: { apiType: ApiType }) {
    if (column.apiType[0] === "array" && column.apiType[1][0] === UNRESOLVED_UDT) {
      const fakeColumn = { apiType: column.apiType[1] as unknown as ApiType }
      resolveType(fakeColumn)
      column.apiType = ["array", fakeColumn.apiType as any as ApiType]
      return 1
    }
    if (column.apiType[0] !== UNRESOLVED_UDT) {
      return 0
    }
    if (["json", "jsonb"].includes(column.apiType[1])) {
      column.apiType = "json"
      return 0
    }
    const type = types.find(t => t.name === column.apiType[1])
    if (type) {
      column.apiType = ["interface", type.apiName] as unknown as ApiType
      return 1
    }
    const enu = enums.find(e => e.name === column.apiType[1])
    if (enu) {
      column.apiType = ["enum", enu.apiName] as unknown as ApiType
      return 1
    }
    throw new Error(`Can't resolve type "${column.apiType[1]}".`)
  }
}

// Currently disabled because it is unused and needs work.
async function resolveRelationships(db: Database, { enums, types, tables }: SchemaData) {
  // const columns: AttrRecord[] = []
  // const keys: KeyRecord[] = []
  // info("discovering table details")
  // for (const table of tables) {
  //   const tableKeys = await db.manyOrNone<KeyRecord>(sql`
  //   select su.table_name "source_table", su.column_name "source_column", tu.table_name "target_table", tu.column_name "target_column"
  //     from information_schema.key_column_usage su
  //     join information_schema.referential_constraints rc
  //       on rc.constraint_name = su.constraint_name
  //      and su.constraint_schema = 'public'
  //      and su.table_name = '${table.name}'
  //      and su.position_in_unique_constraint notnull
  //     join information_schema.key_column_usage tu
  //       on tu.constraint_name = rc.unique_constraint_name
  //   `)
  //   log(`${table.name} foreign keys`, tableKeys.map(k => `${k.source_column}->${k.target_table}.${k.target_column}`).join(", "))
  //   keys.push(...tableKeys)
  // }
  return 0
}
/** Hacky function to support UDTs with naming convention `*_not_null` */
function makeGetAttribute(udts: UdtOptions) {
  // TODO: make HOF, pass in UDTs from config
  return function getAttribute({ name, type, udt, nullable, order }: AttrRecord): AttributeData {
    if (udt?.endsWith("_not_null") || udt?.endsWith("_required")) {
      nullable = false
      udt = udt.replace(/(_not_null)|(_required)$/, "")
    }
    if (udt?.startsWith("_")) {
      udt = udt.substring(1)
    }
    const apiType = deduceType(type, udt, udts)
    if (apiType === null) {
      throw new Error(`Unhandled type "${type} (${udt})" for columns "${name}".`)
    }
    return {
      name,
      order,
      nullable,
      type,
      apiType: apiType,
    }
  }
}

/** Figure out the apiType of a Postgres type. */
function deduceType(type: string, udt: string | null, udts: UdtOptions): ApiType | null {
  if (type === "boolean" || udt === "boolean") {
    return "boolean"
  }
  else if (
    isNumberType(type) || isNumberType(udt) || udts.number.includes(type) || udt && udts.number.includes(udt)
  ) {
    return "number"
  }
  else if (
    isStringType(type) || isStringType(udt) || udts.string.includes(type) || udt && udts.string.includes(udt)
  ) {
    return "string"
  }
  else if (isKnownDateType(type) || isKnownDateType(udt)) {
    return "Date"
  }
  else if (type === "json" || type === "jsonb") {
    return "object"
  }
  else if (type === "USER-DEFINED") {
    return [UNRESOLVED_UDT, udt] as unknown as ApiType
  }
  else if (type === "ARRAY" && udt !== null) {
    let arrayType = deduceType(udt, null, udts)
    if (!arrayType) arrayType = [UNRESOLVED_UDT, udt] as unknown as ApiType
    return ["array", arrayType]
  }
  return null
}

function forceDeduceType(type: string, udt: string | null, udts: UdtOptions) {
  const t = deduceType(type, udt, udts)
  if (t === null) throw new Error(`Unhandled type "${type}/${udt}".`)
  return t
}

const isNumberType = (s: string | null) => s && ([
  "int2",
  "int4",
  "int8",
  "bigint",
  "money",
  "numeric"
]).includes(s)

const isStringType = (s: string | null) => s && ([
  "text",
  "text_not_blank", // TODO: oops
  "uuid",
  "citext",
]).includes(s)

const isKnownDateType = (s: string | null) => s && ([
  "timestamp",
  "timestamptz",
  "timestamp without time zone",
  "timestamp with time zone",
]).includes(s)

interface AttrRecord {
  name: string
  order: number
  type: string
  udt: string | null
  nullable: boolean
  table: string
}

interface KeyRecord {
  source_table: string
  source_column: string
  target_table: string
  target_column: string
}
