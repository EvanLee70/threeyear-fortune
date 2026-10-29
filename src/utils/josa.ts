// Korean postposition picker. Own work.

/** Picks `withBatchim` or `without` by the last Hangul syllable of `word` (trailing hanja, brackets and digits are ignored). */
export function josa(word: string, withBatchim: string, without: string): string {
  const last = [...word].reverse().find((c) => c >= '가' && c <= '힣')
  if (!last) return without
  return (last.charCodeAt(0) - 0xac00) % 28 !== 0 ? withBatchim : without
}
