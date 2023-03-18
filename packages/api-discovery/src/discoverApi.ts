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

const userDefinedType = "USER-DEFINED"
const arrayType = "ARRAY"

/** Inspect a database and build the metadata necessary to generate the API. */
export default async function discover(db: Database, options: DiscoverOptions) {
  const override = options.override ?? {}

  const enums = await findEnums(db)
  const composites = await findComposites(db)
  const tables = await findTables(db)
  const views = await findViews(db)
  const domains = await findDomains(db)
  const functions = await findFunctions(db)
  const schema = createSchema()
  return schema

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
      insertable: insertable === "YES",
      updatable: updatable === "YES",
      apiName: apiName(name),
      columns: attributes.map(createAttribute),
    }
  }

  function createFunction({ name, type, udt, parameters }: FunctionRecord): FunctionData {
    const { apiType } = resolveType(type, udt)
    return {
      name,
      signatureName: apiName(name),
      type: type === userDefinedType ? udt! : type,
      apiType,
      parameters: parameters.map(createAttribute),
    }
  }

  function createAttribute({ name, type, udt, order, nullable }: AttributeRecord): AttributeData {
    const { apiType, forceNotNull } = resolveType(type, udt)
    return {
      name: name ?? `p${order}`,
      type: type === userDefinedType ? udt! : type,
      order,
      nullable: forceNotNull ? false : nullable,
      apiType,
    }
  }

  function resolveType(type: string, udt: string | null): { apiType: ApiType, forceNotNull?: boolean } {
    if (type === arrayType) {
      const { apiType } = resolveType(userDefinedType, udt!.replace(/^_/, ""))
      return { apiType: ["array", apiType ] }
    }
    const knownType = findKnownType(type, udt)
    if (knownType) return { apiType: knownType }
    if (type === userDefinedType) {
      const enu = enums.find(e => e.name === udt)
      if (enu) return { apiType: ["enum", enu.apiName] }
      const composite = composites.find(c => c.name === udt)
      if (composite) return { apiType: ["interface", apiName(composite.name)] }
      const domain = domains.find(d => d.name === udt)
      if (domain) {
        return resolveType(userDefinedType, domain.type)
      }
    }
    console.warn(`Cannot resolve type: ${type}${udt ? ` (${udt})` : ""}`)
    return { apiType: "unknown" }
  }

  function findKnownType(type: string, udt: string | null): ApiType | null {
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
    return null
  }
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

