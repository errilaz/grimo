import pg from "pg-promise"
import options from "toptions"
import discover from "@grimo/api-discovery"
import generate from "@grimo/generate-typescript"
import { ApiType, AttributeData, SchemaData } from "@grimo/metadata"
import { promises as FS } from "fs"
import { constants as FS_CONSTANTS } from "fs"
import Path from "path"
import colors from "tiny-colors"

const parse = options({
  command: options.arg(0),
  file: options.flag("f"),
  output: options.flag("o"),
  host: options.flag("h"),
  port: options.flag("p"),
  dbname: options.flag("d"),
  user: options.flag("U"),
  global: options.bit("g"),
  help: options.bit(),
})

const { command, help, file, ...config } = parse(process.argv.slice(2))
if (config.global === false) config.global = undefined as unknown as boolean

if (command === undefined) {
  console.log("Missing command!")
  usage()
  process.exit(1)
}
if (help || command === "help") {
  usage()
  process.exit(0)
}

const defaults: Project = {
  host: "localhost",
  port: "5432",
  dbname: "postgres",
  user: "postgres",
}

cli()
  .then(() => process.exit())
  .catch(e => { console.error(e); process.exit(1) })

async function cli() {
  const project = override(defaults, await loadProject(), config)
  switch (command) {
    case "build": {
      const path = project.output || null
      if (path === null) {
        console.error("No output file specified.")
        process.exit(1)
        break
      }
      const database = await connect(project)
      const schema = await discover(database, project)
      const ts = generate(schema, project)
      await FS.writeFile(path, ts, "utf8")
      break
    }
    case "details": {
      const database = await connect(project)
      const schema = await discover(database, project)
      details(schema)
      break
    }
    default: {
      console.log(`Unknown command: ${command}`)
      usage()
      process.exit()
    }
  }
}

async function loadProject() {
  let project: Project = {}
  if (file) {
    project = JSON.parse(await FS.readFile(file, "utf8")) as Project
  }
  else {
    project = await findProject() || {}
  }
  return project
}

async function connect({ user, host, port, dbname }: Project): Promise<Database> {
  const conn = pg()({
    host: host!,
    port: parseInt(port!, 10),
    user: user!,
    password: process.env.DB_PASS || "postgres",
    database: dbname!
  })
  const instance = await conn.connect()
  return instance
}

async function findProject(): Promise<Project | null> {
  let dir = process.cwd()
  while (true) {
    const project = Path.join(dir, "grimo.config.json")
    if (await exists(project)) {
      const text = await FS.readFile(project, "utf8")
      return JSON.parse(text) as Project
    }
    if (dir === "/") break
    dir = Path.dirname(dir)
  }
  return null
}

function details(schema: SchemaData) {
  for (const table of schema.tables) {
    console.log()
    console.log(colors.yellow(`${table.apiName} Table`), colors.gray(`(${table.name})`))
    detailAttributes(table.columns)
  }
  for (const view of schema.views) {
    console.log()
    console.log(colors.magenta(`${view.apiName} View`), colors.gray(`(${view.name})`))
    detailAttributes(view.columns)
  }
  for (const type of schema.types) {
    console.log()
    console.log(colors.white(`${type.apiName} Type`), colors.gray(`(${type.name})`))
    detailAttributes(type.attributes)
  }
  for (const enu of schema.enums) {
    console.log()
    console.log(colors.cyan(`${enu.apiName} Enum`), colors.gray(`(${enu.name})`))
    for (const field of enu.fields) {
      console.log(
        colors.gray(field.order.toString().padStart(2) + "."),
        colors.green(field.name),
      )    
    }
  }
  for (const func of schema.functions) {
    console.log()
    console.log(colors.yellow(`${func.name} Function`), colors.gray("returns"), formatType(func))
    detailAttributes(func.parameters)
  }
}

function detailAttributes(attributes: AttributeData[]) {
  for (const attribute of attributes) {
    console.log(
      colors.gray(attribute.order.toString().padStart(2) + "."),
      `${colors.green(attribute.name)}${colors.white(":")}`,
      formatType(attribute)
    )
  }
}

function formatType(thing: { type: string, apiType: ApiType, nullable?: boolean }) {
  return colors.blue(formatApiType(thing.apiType) + (thing.nullable ? " | null" : ""))
    + " " + colors.gray(`(${thing.type})`)
}

function formatApiType(apiType: ApiType): string {
  if (typeof apiType === "string") {
    return apiType
  }
  if (apiType[0] === "array") {
    return formatApiType(apiType[1]) + "[]"
  }
  return apiType[1]
}

type Database = pg.IConnected<{}, any>

interface Project {
  output?: string
  host?: string
  port?: string
  dbname?: string
  user?: string
  override?: { [type: string]: string }
  global?: boolean
}

async function exists(file: string) {
  try {
    await FS.access(file, FS_CONSTANTS.F_OK)
    return true
  }
  catch { return false }
}

function override<T>(...optionSets: T[]) {
  const options: Partial<T> = {}
  for (const set of optionSets) {
    for (const key in set) {
      const value = set[key]
      if (value !== undefined && value !== null) {
        options[key] = value
      }
    }
  }
  return options as T
}

function usage() {
  console.log(`Usage: grimo <command> [options]

  Commands:
    build                 Discover and build TypeScript output
    details               Print schema information

  Options:
    -f, --file <path>     Path to project file (grimo.json)
    -o, --output <path>   Path to output file
    -h, --host <value>    Database hostname
    -p, --port <value>    Database port
    -d, --dbname <value>  Database name
    -U, --user <vaue>     Database user name
    -h, --help            Display this message
`)
}