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

- [x] Basic schema discovery
- [x] Strongly typed API generator
- [x] SELECT and function query builder
- [x] Integration with Express, Koa, HatTip
- [ ] `transport-supabase`
- [ ] `middleware-fastify`
- [ ] `transport-db`: INSERT, UPDATE, DELETE
- [ ] `metadata`/`api-client`: Support additional filters (`like`, `ilike`, `in`, etc.)
- [ ] `metadata`/`api-client`: Support JOINs
- [ ] Support primary and foreign keys
- [ ] Support `select count`
- [ ] Support connection parameters in grimo.json
- [ ] Example project
- [ ] Smarter schema discovery (views, FKs, and better UDTs)
- [ ] `build-schema` package for simple conventional concat/config of .sql files
- [ ] Comprehensive tests
- [ ] Trim down `grimo` package
- [ ] Binary types

## Backlog

- [ ] Investigate decoupling from `pg-promise` - unsure about deno support. `postgres` supports all three runtimes but does not provide standalone escaping/formatting
- [ ] `generate-flow` package
- [ ] `generate-rescript` package
- [ ] Way to discover/generate proper union types
- [ ] Reusable authentication & authorization
- [ ] Realtime streams
- [ ] Tooling/guidance on schema diffing migrations
- [ ] Investigate making a stand-alone server package

