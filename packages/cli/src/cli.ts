import pg from "pg-promise"
import options from "toptions"
import discover from "@grimo/api-discovery"
import generate from "@grimo/generate-typescript"
import { promises as FS } from "fs"
import { constants as FS_CONSTANTS } from "fs"
import Path from "path"

const DB_HOST = process.env.DB_HOST || "localhost"
const DB_PORT = process.env.DB_PORT || "5432"
const DB_NAME = process.env.DB_NAME || "postgres"
const DB_USER = process.env.DB_USER || "postgres"
const DB_PASS = process.env.DB_PASS || "postgres"

const parse = options({
  command: options.arg(0),
  file: options.flag("f"),
  output: options.flag("o"),
  host: options.flag("h", DB_HOST),
  port: options.flag("p", DB_PORT),
  dbname: options.flag("d", DB_NAME),
  user: options.flag("U", DB_USER),
  global: options.flag("g"),
  help: options.bit(),
})

const { command, help, file, ...config } = parse(process.argv.slice(2))

if (command === null) {
  console.log("Missing command!")
  usage()
  process.exit(1)
}
if (help || command === "help") {
  usage()
  process.exit(0)
}

cli()
  .then(() => process.exit())
  .catch(e => { console.error(e); process.exit(1) })

async function cli() {
  const project = await loadProject()
  Object.assign(project, config)
  switch (command) {
    case "discover": {
      const database = await connect(project)
      await discover(database, project)
      break
    }
    case "discover-json": {
      const database = await connect(project)
      const schema = await discover(database, project)
      console.log(JSON.stringify(schema, null, 2))
      break
    }
    case "discover-ts": {
      const database = await connect(project)
      const schema = await discover(database, project)
      const ts = generate(schema, project)
      console.log(ts)
      break
    }
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
    default: {
      console.log(`Unknown command: ${command}`)
      usage()
      process.exit()
    }
  }
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
  console.log(`connecting to ${user}@${host}:${port}/${dbname}`)
  const conn = pg()({
    host: host!,
    port: parseInt(port!, 10),
    user: user!,
    password: DB_PASS,
    database: dbname!
  })
  const instance = await conn.connect()
  console.log("connected!")
  return instance
}

async function findProject(): Promise<Project | null> {
  let dir = process.cwd()
  while (true) {
    const project = Path.join(dir, "grimo.json")
    if (await exists(project)) {
      const text = await FS.readFile(project, "utf8")
      return JSON.parse(text) as Project
    }
    if (dir === "/") break
    dir = Path.dirname(dir)
  }
  return null
}

async function exists(file: string) {
  try {
    await FS.access(file, FS_CONSTANTS.F_OK)
    return true
  }
  catch { return false }
}

function usage() {
  console.log(`Usage: grimo <command> [options]

  Commands:
    build                 Discover and build TypeScript output
    discover              Print schema information
    discover-json         Print schema in JSON
    discover-ts           Print schema in TypeScript

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