import type { SchemaData, EnumData, TypeData, TableData, FuncData, ApiType, AttributeData } from "@grimo/metadata"
import type * as pg from "pg-promise"

/**
 * This is a rough first pass at the schema inspector.
 *    TODO: views
 *    TODO: represent foreign keys
 *    TODO: better UDT detection
 */

type Database = pg.IConnected<{}, any>

/** Inspect a database and build the metadata necessary to generate the API. */
export default async function discoverApi(db: Database, settings: Partial<DiscoverOptions> = {}): Promise<SchemaData> {
  const { verbose, udts }: DiscoverOptions = {
    verbose: !!settings.verbose,
    udts: {
      string: settings.udts?.string || [],
      number: settings.udts?.number || [],
    }
  }

  log("discovering enum types")
  const enums = await discoverEnums(db)
  log("enums", enums)

  log("discovering composite types")
  const types = await discoverTypes(db, udts)
  log("composite types", types)

  log("discovering tables")
  const tables = await discoverTables(db, udts)
  log("tables", tables)

  log("discovering functions")
  const functions = await discoverFunctions(db, udts)
  log("functions", functions)

  const schema = { enums, types, tables, functions }

  log("resolving types")
  const resolved = resolveTypes(schema)
  log("resolutions", resolved)

  // log("resolving relationships")
  // const relationships = await resolveRelationships(db, schema)
  // log("relationships", relationships)

  return schema

  function log(...args: any[]) {
    if (verbose) console.log(...args)
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

/** Collect metadata about database enums. */
async function discoverEnums(db: Database): Promise<EnumData[]> {
  return (await db.manyOrNone<{
    name: string
    order: number
    enum_name: string
  }>(sql`
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

/** Collect metadata about composite user-defined types. */
async function discoverTypes(db: Database, udts: UdtOptions): Promise<TypeData[]> {
  return Promise.all((await db.manyOrNone<{ name: string }>(sql`
    select i.user_defined_type_name "name"
      from information_schema.user_defined_types i
     where i.user_defined_type_schema = 'public'
    `)).map(async ({ name }) => ({
    name,
    apiName: snakeToPascal(name),
    attributes: (await db.manyOrNone<AttrRecord>(sql`
      select i.attribute_name "name", i.ordinal_position "order", i.is_nullable = 'YES' "nullable", i.data_type "type", i.attribute_udt_name "udt"
        from information_schema.attributes i
       where i.udt_schema = 'public'
         and i.udt_name = '${name}'
    `)).map(makeGetAttribute(udts))
  })))
}

/** Collect metadata about tables. */
async function discoverTables(db: Database, udts: UdtOptions): Promise<TableData[]> {
  return Promise.all((await db.manyOrNone<{ name: string }>(sql`
      select table_name "name"
      from information_schema.tables
      where table_schema = 'public'
    `)).map(async ({ name }) => ({
    name,
    apiName: snakeToPascal(name),
    columns: (await db.manyOrNone<AttrRecord>(sql`
      select i.column_name "name", i.ordinal_position "order", i.is_nullable = 'YES' "nullable", i.data_type "type", i.udt_name "udt"
        from information_schema.columns i
      where i.table_schema = 'public'
        and i.table_name = '${name}'
    `)).map(makeGetAttribute(udts))
  })))
}

/** Collect metadata about functions. */
async function discoverFunctions(db: Database, udts: UdtOptions): Promise<FuncData[]> {
  return Promise.all((await db.manyOrNone<{
    name: string, type: string, udt: string | null, specific_name: string
  }>(sql`
      select routine_name "name", data_type "type", udt_name "udt", specific_name
      from information_schema.routines
      where specific_schema = 'public'
  `)).map(async ({ name, type, udt, specific_name }) => ({
    name,
    returnType: forceDeduceType(type, udt, udts),
    parameters: (await db.manyOrNone<{
      name: string, type: string, udt: string | null, order: number
    }>(sql`
        select parameter_name "name", data_type "type", udt_name "udt", ordinal_position "order"
          from information_schema.parameters
         where specific_name = '${specific_name}'
      order by specific_name, ordinal_position asc
    `)).map(({ name, type, udt, order }) => ({
      name,
      order,
      nullable: false,
      apiType: forceDeduceType(type, udt, udts)
    }))
  })))
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
    if (udt?.endsWith("_not_null")) {
      nullable = false
      udt = udt.substring(0, udt.length - "_not_null".length)
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

/** Pass-thru template string function for IDE hiliting. */
function sql(literals: TemplateStringsArray, ...placeholders: (string | number | boolean)[]) {
  let s = ""
  for (let i = 0; i < placeholders.length; i++) {
    s += literals[i]
    s += placeholders[i]
  }
  s += literals[literals.length - 1]
  return s
}

export function snakeToPascal(word: string) {
  return word[0].toUpperCase() + word.substring(1)
    .replace(/_(\w)/g, (_, w) => w.toUpperCase())
}
