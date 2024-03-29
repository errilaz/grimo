import type {
  SchemaData, TableData, FunctionData,
  ApiTransport,
  SelectQuery, InsertCommand, UpdateCommand, DeleteCommand, CallCommand,
  UnaryOperator, BinaryOperator, Condition
} from "@grimo/metadata"

/** Generic shape of generated API. */
export interface ApiBase<Tables, Views, Functions> {
  /** Tables in this schema. */
  tables: Tables
  /** Views in this schema. */
  views: Views
  /** Functions in this schema. */
  functions: Functions
  /** Information about the schema. */
  schema: SchemaData
}

/** Query building interface. */
export type ApiClient<Api extends ApiBase<Api["tables"], Api["views"], Api["functions"]>> =
& TablesClient<Api["tables"]>
& TablesClient<Api["views"]>
& FunctionsClient<Api["functions"]>

/** Strongly-typed interface to database tables in the API. */
export type TablesClient<Tables> = { [Table in keyof Tables]: TableApi<Tables[Table]> }

/** Strongly-typed interface to database functions in the API. */
export type FunctionsClient<Functions> = { [Function in keyof Functions]: Functions[Function] }

export module ApiClient {
  const define = (o: any, p: string, value: any) => Object.defineProperty(o, p, { value, enumerable: true })
  
  /** Create a client interface with the given generated API and a transport. */
  export function create<Api extends ApiBase<Api["tables"], Api["views"], Api["functions"]>>(api: Api, transport: ApiTransport): ApiClient<Api> {
    const client: Partial<ApiClient<Api>> = {}
    for (const table of api.schema.tables) {
      define(client, table.name, new ClientTableApi(transport, table))
    }
    for (const view of api.schema.views) {
      define(client, view.name, new ClientTableApi(transport, view))
    }
    for (const func of api.schema.functions) {
      define(client, func.name, functionApi(transport, func))
    }
    return client as ApiClient<Api>
  }
}

/* Table functions. */
export interface TableApi<Table> {
  /** Issue a `SELECT *` query to the API. */
  select(all: "*"): Select<Table, Table>
  /** Issue a `SELECT` query to the API with the chosen columns. */
  select<Column extends (keyof Table)>(columns: Column[]): Select<Pick<Table, Column>, Table>
  /** Issue an `INSERT` statement. */
  insert(row: Partial<Table>): Insert<Table, Table, number>
  /** Issue an `INSERT` statement with the chosen columns. */
  insert<Column extends (keyof Table)>(columns: Column[], rows: Pick<Table, Column>[]): Insert<Column, Table, number>
  /** Issue an `UPDATE` statement. */
  update(row: Partial<Table>): Update<Table, number>
  /** Issue a `DELETE` statement. */
  delete(): Delete<Table, number>
}

/* Represents queries/statments with a `WHERE` clause. */
export interface HasWhereClause<Table> {
  /** Add a condition where the given column equals the given value. */
  where<Column extends keyof Table>(column: Column, value: Table[Column]): this
  /** Add a unary `WHERE` condition. */
  where<Column extends keyof Table>(column: Column, operator: UnaryOperator): this
  /** Add a binary `WHERE` condition. */
  where<Column extends keyof Table>(column: Column, operator: BinaryOperator, value: Table[Column]): this
}

/** Select query builder. */
export interface Select<Columns, Table> extends HasWhereClause<Table> {
  /** Issue the query, expecting an array of results. */
  fetch(): Promise<Columns[]>
  /** Issue the query, returning a single result, or throwing.. */
  fetchOne(): Promise<Columns>
  /** Add a `LIMIT` clause. */
  limit(n: number): this
  /** Add an `OFFSET` clause. */
  offset(n: number): this
  /** Add an `ORDER BY` sort expression. */
  orderBy(sorts: [keyof Table, "asc" | "desc"][]): this
}

/** Insert statement builder. */
export interface Insert<Columns, Table, Returning> {
  /** Execute the statement. */
  execute(): Promise<Returning>
  /** Specify a `RETURNING *` clause. */
  returning(all: "*"): Insert<Columns, Table, Table[]>
  /** Specify a `RETURNING` clause with the chosen columns. */
  returning<Column extends (keyof Table)>(columns: Column[]): Insert<Columns, Table, Pick<Table, Column>[]>
}

/** Update statement builder. */
export interface Update<Table, Returning> extends HasWhereClause<Table> {
  /** Execute the statement. */
  execute(): Promise<Returning>
  /** Specify a `RETURNING *` clause. */
  returning(all: "*"): Update<Table, Table[]>
  /** Specify a `RETURNING` clause with the chosen columns. */
  returning<Column extends (keyof Table)>(columns: Column[]): Update<Table, Pick<Table, Column>[]>
}

/** Delete statement builder. */
export interface Delete<Table, Returning> extends HasWhereClause<Table> {
  /** Execute the statement. */
  execute(): Promise<Returning>
  /** Specify a `RETURNING *` clause. */
  returning(all: "*"): Delete<Table, Table[]>
  /** Specify a `RETURNING` clause with the chosen columns. */
  returning<Column extends (keyof Table)>(columns: Column[]): Delete<Table, Pick<Table, Column>[]>
}

/** Constructs table queries/statements for sending through a transport. */
class ClientTableApi implements TableApi<any> {
  private transport: ApiTransport
  private table: TableData

  constructor(transport: ApiTransport, table: TableData) {
    this.transport = transport
    this.table = table
  }

  select(all: "*"): Select<any, any>
  select<Column extends string>(columns: Column[]): Select<Pick<any, any>, any>
  select(columns: "*" | string[]): Select<any, any> | Select<Pick<any, any>, any> {
    return new SelectBuilder(this.transport, this.table, columns)
  }

  insert(row: Partial<any>): Insert<any, any, number>
  insert<Column extends string | number | symbol>(columns: Column[], rows: Pick<any, Column>[]): Insert<Column, any, number>
  insert(columns: any, rows?: any): Insert<any, any, number> | Insert<any, any, number> {
    return new InsertBuilder(this.transport, this.table, columns, rows)
  }

  update(row: Partial<any>): Update<any, number> {
    return new UpdateBuilder(this.transport, this.table, row)
  }

  delete(): Delete<TableData, number> {
    return new DeleteBuilder(this.transport, this.table)
  }
}

/** Constructs declarative `SELECT` statements. */
class SelectBuilder implements Select<any, any> {
  transport: ApiTransport
  table: TableData
  query: SelectQuery

  constructor(transport: ApiTransport, table: TableData, columns: "*" | string[]) {
    this.transport = transport
    this.table = table
    this.query = { table: table.name }
    if (Array.isArray(columns)) {
      this.query.selected = columns
    }
  }

  fetch(): Promise<any[]> {
    return this.transport.select(this.query)
  }

  async fetchOne(): Promise<any> {
    const results = await this.transport.select(this.query)
    if (results[0] === undefined) {
      throw new Error(`Query did not return a result (table: "${this.table.name}").`)
    }
    return results[0]
  }

  limit(n: number) {
    this.query.limit = n
    return this
  }

  offset(n: number) {
    this.query.offset = n
    return this
  }

  where(column: string, value: any): this
  where(column: string, operator: UnaryOperator): this
  where(column: string, operator: BinaryOperator, value: any): this
  where(column: string, operator: any, value?: any) {
    where(column, this.query, operator, value)
    return this
  }

  orderBy(sorts: [string, "asc" | "desc"][]): this {
    this.query.orderBy = sorts
      .map(([column, direction]) => ({ column, direction }))
    return this
  }
}

/** Constructs declarative `INSERT` statements. */
class InsertBuilder implements Insert<any, any, any> {
  transport: ApiTransport
  table: TableData
  command: InsertCommand

  constructor(transport: ApiTransport, table: TableData, rowOrColumns: any, rows: any) {
    this.transport = transport
    this.table = table
    this.command = { table: table.name }
  }

  execute(): Promise<any> {
    return this.transport.insert(this.command)
  }

  returning(all: "*"): Insert<any, any, any[]>
  returning(columns: string[]): Insert<any, any, Pick<any, any>[]>
  returning(columns: "*" | string[]) {
    this.command.returning = columns === "*" ? ["*"] : columns
    return this
  }
}

/** Constructs declarative `UPDATE` statements. */
class UpdateBuilder implements Update<any, any> {
  transport: ApiTransport
  table: TableData
  command: UpdateCommand

  constructor(transport: ApiTransport, table: TableData, row: any) {
    this.transport = transport
    this.table = table
    this.command = { table: table.name }
  }

  execute(): Promise<any> {
    return this.transport.update(this.command)
  }

  returning(all: "*"): Update<any, any[]>
  returning(columns: string[]): Update<any, Pick<any, any>[]>
  returning(columns: any): Update<any, any[]> | Update<any, Pick<any, any>[]> {
    this.command.returning = columns === "*" ? ["*"] : columns
    return this
  }

  where(column: string, value: any): this
  where(column: string, operator: UnaryOperator): this
  where(column: string, operator: BinaryOperator, value: any): this
  where(column: any, operator: any, value?: any): this {
    where(column, this.command, operator, value)
    return this
  }
}

/** Constructs declarative `DELETE` statements. */
class DeleteBuilder implements Delete<any, any> {
  transport: ApiTransport
  table: TableData
  command: DeleteCommand

  constructor(transport: ApiTransport, table: TableData) {
    this.transport = transport
    this.table = table
    this.command = { table: table.name }
  }

  execute(): Promise<any> {
    return this.transport.update(this.command)
  }

  returning(all: "*"): Delete<any, any[]>
  returning(columns: string[]): Delete<any, Pick<any, any>[]>
  returning(columns: any): Delete<any, any[]> | Delete<any, Pick<any, any>[]> {
    this.command.returning = columns === "*" ? ["*"] : columns
    return this
  }

  where(column: string, value: any): this
  where(column: string, operator: UnaryOperator): this
  where(column: string, operator: BinaryOperator, value: any): this
  where(column: any, operator: any, value?: any): this {
    where(column, this.command, operator, value)
    return this
  }
}

/** Constructs declarative function calls. */
function functionApi(transport: ApiTransport, func: FunctionData) {
  return (...parameters: any[]) => {
    return transport.call({ procedure: func.name, parameters })
  }
}

/** Constructs `WHERE` clauses. */
function where(column: string, query: { conditions?: Condition[] }, operator: any, value?: any) {
  if (query.conditions === undefined) query.conditions = []
  if (value !== undefined && isBinaryOperator(operator)) {
    query.conditions.push({ column, arity: 2, operator, value })
  }
  else if (isUnaryOperator(operator)) {
    query.conditions.push({ column, arity: 1, operator })
  }
  else {
    query.conditions.push({ column, arity: 2, operator: "=", value: operator })
  }
}

const unaryOperators = [
  "is null",
  "is not null",
  "is true",
  "is not true",
  "is false",
  "is not false",
  "is unknown",
  "is not unknown",
]

function isUnaryOperator(o: string) {
  return unaryOperators.includes(o)
}

const binaryOperators = [
  "=",
  "<>",
  ">",
  "<",
  ">=",
  "<=",
  "is distinct from",
  "is not distinct from",
  "like",
  "not like",
  "ilike",
  "not ilike",
  "similar to",
  "not similar to",
  "~",
  "~*",
  "!~",
  "!~*",
  "^@",
  "between",
  "not between",
  "between symmetric",
  "not between symmetric",
]

function isBinaryOperator(o: string) {
  return binaryOperators.includes(o)
}
