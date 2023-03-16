import type { SchemaData, TypeData, TableData, FunctionData, ApiType, AttributeData, ViewData } from "@grimo/metadata"
import { Database, apiName } from "./common"
import findComposites, { AttributeRecord, CompositeRecord } from "./findComposites"
import findDomains from "./findDomains"
import findEnums from "./findEnums"
import findFunctions, { FunctionRecord } from "./findFunctions"
import findTables from "./findTables"
import findViews, { ViewRecord } from "./findViews"

export interface DiscoverOptions {
  override?: { [type: string]: string }
}

const userDefined = "USER-DEFINED"

/** Inspect a database and build the metadata necessary to generate the API. */
export default async function discover(db: Database, options: DiscoverOptions) {
  const override = options.override ?? {}

  const enums = await findEnums(db)
  const composites = await findComposites(db)
  const tables = await findTables(db)
  const views = await findViews(db)
  const domains = await findDomains(db)
  const functions = await findFunctions(db)
  return createSchema()

  function createSchema(): SchemaData {
    return {
      enums,
      types: composites.map(createType),
      tables: tables.map(createTable),
      views: views.map(createView),
      functions: functions.map(createFunction),
    }
  }

  function createType({ name, attributes }: CompositeRecord): TypeData {
    return {
      name,
      apiName: apiName(name),
      attributes: attributes.map(createAttribute),
    }
  }

  function createTable({ name, attributes }: CompositeRecord): TableData {
    return {
      name,
      apiName: apiName(name),
      columns: attributes.map(createAttribute),
    }
  }

  function createView({ name, attributes, updatable, insertable }: ViewRecord): ViewData {
    return {
      name,
      insertable,
      updatable,
      apiName: apiName(name),
      columns: attributes.map(createAttribute),
    }
  }

  function createFunction({ name, type, udt, parameters }: FunctionRecord): FunctionData {
    return {
      name,
      returnType: type,
      apiReturnType: resolveType(type, udt),
      parameters: parameters.map(createAttribute),
    }
  }

  function createAttribute({ name, type, udt, order, nullable }: AttributeRecord): AttributeData {
    return {
      name,
      type,
      order,
      nullable,
      apiType: resolveType(type, udt),
    }
  }

  function resolveType(type: string, udt: string | null): ApiType {
    if (override.hasOwnProperty(type)) {
      return ["override", override[type]]
    }
    if (udt && override.hasOwnProperty(udt)) {
      return ["override", udt]
    }
    if (isBooleanType(type) || isBooleanType(udt)) {
      return "boolean"
    }
    if (isNumberType(type) || isNumberType(udt)) {
      return "number"
    }
    if (isStringType(type) || isStringType(udt)) {
      return "string"
    }
    if (isDateType(type) || isDateType(udt)) {
      return "date"
    }
    if (isBigIntType(type) || isBigIntType(udt)) {
      return "bigint"
    }
    if (isJsonType(type) || isJsonType(udt)) {
      return "json"
    }
    if (type === userDefined) {
      const enu = enums.find(e => e.name === udt)
      if (enu) return ["enum", enu.apiName]
      const composite = composites.find(c => c.name === udt)
      if (composite) return ["interface", apiName(composite.name)]
    }
    console.log(type, udt)
    console.log(domains)
    return "UNRESOLVED" as unknown as ApiType
  }
}

/** Collect metadata about user-defined types. */
function resolveTypesOld({ enums, types, tables, functions }: SchemaData) {
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
  else if (isDateType(type) || isDateType(udt)) {
    return "date"
  }
  else if (type === "json" || type === "jsonb") {
    return "json"
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

const isBooleanType = (t: string | null) => typeof t === "string" && [
  "boolean",
  "bool",
].includes(t)

const isNumberType = (t: string | null) => typeof t === "string" && [
  "int2",
  "int4",
  "int8",
  "smallint",
  "integer",
  "real",
  "double precision",
  "smallserial",
  "serial",
].includes(t)

const isBigIntType = (t: string | null) => typeof t === "string" && [
  "bigint",
  "bigserial",
].includes(t)

const isStringType = (t: string | null) => typeof t === "string" && [
  "text",
  "uuid",
  "citext",
  "money",
  "decimal",
  "numeric",
  "character",
  "character varying",
  "cidr",
  "inet",
  "macaddr",
  "macaddr8",
].includes(t)

const isDateType = (t: string | null) => t && [
  "timestamp",
  "timestamptz",
  "timestamp without time zone",
  "timestamp with time zone",
].includes(t)

const isJsonType = (t: string | null) => typeof t === "string" && [
  "json",
  "jsonb",
].includes(t)

interface AttrRecord {
  name: string
  order: number
  type: string
  udt: string | null
  nullable: boolean
  table: string
}
