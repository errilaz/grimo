export default class CodeBuilder {
  private code = ""
  private depth = 0
  private justWroteLine = false

  toString() { return this.code }

  indent() {
    this.depth++
    if (this.justWroteLine) this.code += "  "
    return this
  }

  dedent() {
    this.depth = Math.max(this.depth - 1, 0)
    if (this.justWroteLine) {
      this.code = this.code.replace(/  $/, "")
    }
    return this
  }

  push(s: string) {
    this.justWroteLine = false
    this.code += s
    return this
  }

  line(s?: string) {
    if (s !== undefined) this.push(s)
    this.code += "\n"
    this.code += "  ".repeat(this.depth)
    this.justWroteLine = true
    return this
  }

  when(truthy: any, s: string): this
  when<T>(truthy: T | undefined | null, sub: (obj: T) => void): this
  when(truthy: any, stringOrSub: string | ((obj: any) => void)) {
    if (typeof stringOrSub === "string") {
      if (truthy) this.push(stringOrSub)
      return this
    }
    else if (truthy) {
      stringOrSub(truthy)
    }
    return this
  }

  each<T>(objs: T[] | null | undefined, cb: (obj: T, i: number) => void) {
    if (objs) {
      let o = 0
      for (const obj of objs) {
        cb(obj, o++)
      }
    }
    return this
  }

  pipe(fn: (cb: CodeBuilder) => void) {
    fn(this)
    return this
  }
}
