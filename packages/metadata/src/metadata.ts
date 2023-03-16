/**
 * This file defines the basic types for representing
 * Postgres types in TypeScript.
 */

/** Communication interface for ApiClient. */
export interface ApiTransport {
  /** Issue a SELECT query to the transport. */
  select(select: SelectQuery): Promise<any[]>
  /** Issue an INSERT to the transport. */
  insert(insert: InsertCommand): Promise<any[]>
  /** Issue an UPDATE to the transport. */
  update(update: UpdateCommand): Promise<any[]>
  /** Issue a DELETE to the transport. */
  delete(del: DeleteCommand): Promise<any[]>
  /** Issue a function call to the transport. */
  call(call: CallCommand): Promise<any>
}

/** Communication interface for Postgres. */
export interface DbDriver {

}

/** SQL escaping functions. Subset of pg-promise's `IFormatting` */
export interface DbFormatter {
  name(name: any | (() => any)): string
  number(value: number | bigint | (() => number | bigint)): string
  value(value: any | (() => any)): string
}

// Schema

/** Information about the schema. */
export interface SchemaData {
  tables: TableData[]
  views: ViewData[]
  types: TypeData[]
  enums: EnumData[]
  functions: FunctionData[]
}

/** Type representations of database values. */
export type ApiType = 
| "boolean"
| "number"
| "bigint"
| "string"
| "json"
| "date"
| ["enum", string]
| ["interface", string]
| ["array", ApiType]
| ["override", string]

/** Table metadata. */
export interface TableData {
  /** Database name of the table. */
  name: string
  /** Generated API name of the table. */
  apiName: string
  /** Metadata about table columns. */
  columns: AttributeData[]
}

/** Composite type metadata.  */
export interface TypeData {
  /** Database name of the composite type. */
  name: string
  /** Generated API name of the composite type. */
  apiName: string
  /** Metadata about the type's attributes. */
  attributes: AttributeData[]
}

/** View metadata. */
export interface ViewData {
  /** Database name of the view. */
  name: string
  /** Generated API name of the view. */
  apiName: string
  /** Metadata about view columns. */
  columns: AttributeData[]
  /** This view can be updated. */
  updatable: boolean
  /** This view can be inserted into. */
  insertable: boolean
}

/** Represents a composite type attribute. */
export interface AttributeData {
  /** Database name of the attribute. */
  name: string
  /** Database type of the attribute. */
  type: string
  /** Order of the attribute. */
  order: number
  /** Whether this attribute allows NULL as a value. */
  nullable: boolean
  /** API type of the attribute. */
  apiType: ApiType
}

/** Represents a database enum. */
export interface EnumData {
  /** Database name of the enum. */
  name: string
  /** Generated API name of the enum. */
  apiName: string
  /** Possible fields of this enum. */
  fields: FieldData[]
}

/** Represents a database enum field. */
export interface FieldData {
  /** Database name of the enum field. */
  name: string
  /** Order of the field. */
  order: number
}

/** Represents a database function (stored procedure). */
export interface FunctionData {
  /** Database name of the function. */
  name: string
  /** Parameters this function accepts. */
  parameters: AttributeData[]
  /** Database type of the return value. */
  returnType: string
  /** API type of the return value. */
  apiReturnType: ApiType
}

// Queries and commands

/** Represents a select query. */
export interface SelectQuery {
  /** Table this query is performed on. */
  table: string
  /** Limit clause. */
  limit?: number
  /** Offset clause. */
  offset?: number
  /** Conditions of the SELECT. */
  conditions?: Condition[]
  /** Which columns are being selected in this query. */
  selected?: string[]
  /** Order By clause */
  orderBy?: {
    /** Order by columns. */
    columns: string[]
    /** Order by direction (`asc` or `desc`) */
    direction: "asc" | "desc"
  }
}

/** Represents an update command. */
export interface UpdateCommand {
  /** Table being UPDATEd.. */
  table: string
  /** Conditions of the UPDATE. */
  conditions?: Condition[]
  /** Returning clause. */
  returning?: string[]
}

/** Represents an insert command. */
export interface InsertCommand {
  /** Table being INSERTed to. */
  table: string
  /** Returning clause. */
  returning?: string[]
}

/** Represents a delete command. */
export interface DeleteCommand {
  table: string
  conditions?: Condition[]
  returning?: string[]
}

/** Represents a function call. */
export interface CallCommand {
  /** Function being called. */
  procedure: string
  /** Parameters passed to the function/ */
  parameters?: any[]
}

/* Represents a condition. */
export type Condition =
| UnaryCondition
| BinaryCondition
| TernaryCondition

/** A unary condition. */
export interface UnaryCondition {
  column: string
  arity: 1
  operator: UnaryOperator
}

/** A binary condition. */
export interface BinaryCondition {
  column: string
  arity: 2
  operator: BinaryOperator
  value: any
}

export interface TernaryCondition {
  column: string
  arity: 2
  operator: TernaryOperator
  value1: any
  value2: any
}

/** Unary operator. */
export type UnaryOperator =
| "is null"
| "is not null"
| "is true"
| "is not true"
| "is false"
| "is not false"
| "is unknown"
| "is not unknown"

/** Binary operator. */
export type BinaryOperator =
| "="
| "<>"
| ">"
| "<"
| ">="
| "<="
| "is distinct from"
| "is not distinct from"
| "like"
| "not like"
| "ilike"
| "not ilike"
| "similar to"
| "not similar to"
| "~"
| "~*"
| "!~"
| "!~*"
| "^@"

export type TernaryOperator =
| "between"
| "not between"
| "between symmetric"
| "not between symmetric"