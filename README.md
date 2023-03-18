# Grimo

> Postgres-first data framework

⚠️ Under heavy construction, pre-alpha state! ⚠️

⚠️ Working directly on `master` branch - I will break it! ⚠️

- Automatically build an API from your database schema and use it directly on the front-end.
- Stop writing boilerplate HTTP endpoints. Your database has tables, views, and functions.
- Stop using ORMs, micro-ORMs, & mappers. Your database has types.
- Stop writing authentication & authorization middleware. Your database has row-level security.
- A relational database is a **great** place for "business logic".

## Similar Projects

These are much more mature, consider them instead!

- [Kysely](https://github.com/koskimas/kysely)
- [Orchid ORM](https://orchid-orm.netlify.app)
- [Zapatos](https://jawj.github.io/zapatos/)
- [pgtyped](https://github.com/adelsz/pgtyped)
- [Drizzle ORM](https://github.com/drizzle-team/drizzle-orm)
- [Supabase](https://postgrest.org/en/stable/)
- [PostgREST](https://postgrest.org/en/stable/)
- [Hasura](https://hasura.io)

Most of these libraries are meant for server-side DB access. Grimo is focused on eliminating the server-side as much as possible (similar to Supabase).

## Roadmap

### Basic features

- [x] Schema discovery
- [x] Strongly typed API generator
- [x] SELECT and function query builder
- [ ] Example project
- [ ] Tests
s
### Basic SQL operations (`@grimo/db-transport`)

- [x] Select queries
- [ ] Inserts
- [ ] Updates
- [ ] Deletes
- [ ] Function calls

### Query Builder (`@grimo/api-client`)

- [x] Selects
- [x] Inserts
- [x] Updates
- [x] Deletes
- [ ] Function calls
- [ ] Joins
- [ ] `DISTINCT`
- [ ] `COUNT`
- [ ] `GROUP BY`

### Schema Discovery & Metadata

- [x] Tables
- [x] Views
- [x] Functions
- [x] Composite types
- [x] Enums
- [x] Domains
- [ ] Primary keys
- [ ] Foreign keys
- [ ] [`pg_tagged_unions`](https://github.com/errilaz/pg_tagged_unions) support
- [ ] Binary data types

### Middleware

- [x] `middleware-express`
- [x] `middleware-koa`
- [x] `middleware-hattip`
- [ ] `middleware-fastify`
- [ ] `middleware-bun`
- [ ] `middleware-elysia`
- [ ] `middleware-hono`

### Transports

- [x] `transport-web`
- [ ] `transport-db` (partial)
- [ ] `transport-supabase` (experimental)

## Backlog

- [ ] Investigate decoupling from `pg-promise` - unsure about deno support. `postgres` supports all three runtimes but does not provide necessary standalone escaping/formatting
- [ ] `generate-rescript` package
- [ ] Reusable authentication & authorization
- [ ] Realtime streams
- [ ] Tooling/guidance on schema diffing migrations
- [ ] Investigate making a stand-alone server package
- [ ] `build-schema` package for simple conventional concat/config of .sql files
