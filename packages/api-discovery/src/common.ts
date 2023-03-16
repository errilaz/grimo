import type * as pg from "pg-promise"

export type Database = pg.IConnected<{}, any>

export function snakeToPascal(word: string) {
  return word[0].toUpperCase() + word.substring(1)
    .replace(/_(\w)/g, (_, w) => w.toUpperCase())
}
