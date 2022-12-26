import pg from "pg-promise"
import options from "toptions"
import discover, { UdtOptions } from "@grimo/api-discovery"
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
  command: options.arg(0, [
    ["discover", "print human schema information"],
    ["discover-json", "print schema in JSON"],
    ["discover-ts", "print schema in TypeScript"],
    ["build", "discover and build TypeScript output"],
  ]),
  file: options.flag("f", "path to project file (grimo.json)"),
  output: options.flag("o", "send results to file"),
  host: options.flag("h", "database hostname", DB_HOST),
  port: options.flag("p", "database port", DB_PORT),
  dbname: options.flag("d", "database name", DB_NAME),
  user: options.flag("U", "database user name", DB_USER),
  help: options.bit("Display this message"),
})

const { command, help, host, port, dbname, user, file, output } = parse(process.argv.slice(2))

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
  switch (command) {
    case "discover": {
      const project = await loadProject()
      const database = await connect(true)
      await discover(database, { verbose: true, udts: project.udts })
      break
    }
    case "discover-json": {
      const project = await loadProject()
      const database = await connect()
      const schema = await discover(database, { udts: project.udts })
      console.log(JSON.stringify(schema, null, 2))
      break
    }
    case "discover-ts": {
      const project = await loadProject()
      const database = await connect()
      const schema = await discover(database, { udts: project.udts })
      const ts = generate(schema)
      console.log(ts)
      break
    }
    case "build": {
      const project = await loadProject()
      const path = output || project.output || null
      if (path === null) {
        console.error("No output file specified")
        process.exit(1)
        break
      }
      const database = await connect(true)
      const schema = await discover(database, { verbose: true, udts: project.udts })
      const ts = generate(schema)
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
  udts?: UdtOptions
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

async function connect(verbose = false): Promise<Database> {
  if (verbose) console.log(`connecting to ${user}@${host}:${port}/${dbname}`)
  const conn = pg()({
    host: host!,
    port: parseInt(port!, 10),
    user: user!,
    password: DB_PASS,
    database: dbname!
  })
  const instance = await conn.connect()
  if (verbose) console.log("connected!")
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