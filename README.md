# Grimo

> Postgres-first data framework

⚠️ Under heavy construction, pre-alpha state! ⚠️

- Automatically build an API from your database schema and use it directly on the front-end.
- Stop writing boilerplate HTTP endpoints. Your database has tables, views, and functions.
- Stop using ORMs, micro-ORMs, & mappers. Your database has types.
- Stop writing authentication & authorization middleware. Your database has row-level security.
- A relational database is a **great** place for "business logic".

## Roadmap

- [x] Basic schema discovery
- [x] Strongly typed API generator
- [x] SELECT and function query builder
- [x] Integration with Express, Koa, HatTip
- [ ] `middleware-fastify`
- [ ] INSERT, UPDATE, DELETE
- [ ] Support connection parameters in grimo.json
- [ ] Example project
- [ ] Smarter schema discovery (views, FKs, and better UDTs)
- [ ] `build-schema` package for simple conventional concat/config of .sql files
- [ ] Comprehensive tests

## Backlog

- [ ] `driver-node` package (decouple others from pg-promise)
- [ ] `driver-deno` package
- [ ] `driver-bun` package
- [ ] `generate-flow` package
- [ ] Way to discover/generate proper union types
- [ ] Reusable authentication & authorization
- [ ] Realtime streams
- [ ] Tooling/guidance on schema diffing migrations

## Similar Projects

- [PostgREST](https://postgrest.org/en/stable/)
- [Supabase](https://postgrest.org/en/stable/)
- [Hasura](https://hasura.io)
- [Zapatos](https://jawj.github.io/zapatos/)
- [pgtyped](https://github.com/adelsz/pgtyped)

## Background

For years I made various attempts at code-first database schema from the side of the database client, to reduce boilerplate/duplication. In a language with rich reflection such as C# this is easier than in JS/TS, but it still adds unnecessary complexity with schema changes and other considerations.

Realizing that Postgres has everything I need already, and is in fact a better place to place logic related to the data, I decided to reverse the direction and generate the client artifacts from those defined in SQL; relying on Postgres' rich features, including triggers, RLS, and great user-defined types.

Grimo began as a simple alternative to Supabase's type generator, which, at the time, was fairly limited. Supabase is amazing but is a large & opinionated project which couples to a lot of components I don't always necessarily need or want, so I've decided to make this a standalone project, usable with or without Supabase.
