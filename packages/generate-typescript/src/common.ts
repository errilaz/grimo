export type CodeWriter = ReturnType<typeof codeWriter>
export function codeWriter() {
  let code = ""
  let depth = 0
  let justWroteLine = false

  return {
    toString() { return code },

    /** Indent. */
    indent() {
      depth++
      if (justWroteLine) code += "  "
      return this
    },

    /** Dedent. */
    dedent() {
      depth = Math.max(depth - 1, 0)
      if (justWroteLine) code = code.replace(/  $/, "")
      return this
    },

    /** Append text. */
    push(...ss: any[]) {
      justWroteLine = false
      for (const s of ss) code += String(s)
      return this
    },

    /** Append text and newline, indenting next line. */
    line(...ss: any[]) {
      this.push(...ss)
      code += "\n"
      code += "  ".repeat(depth)
      justWroteLine = true
      return this
    },
  }
}
