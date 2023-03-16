import type * as pg from "pg-promise"

export type Database = pg.IConnected<{}, any>

/** Returns `PascalCase` of `snake_case` name.  */
export function apiName(word: string) {
  return word[0].toUpperCase() + word.substring(1)
    .replace(/_(\w)/g, (_, w) => w.toUpperCase())
}
