import { describe, expect, it } from 'vitest'
import { josa } from '../src/utils/josa.ts'

describe('josa', () => {
  it('picks by the final consonant of the last Hangul syllable', () => {
    expect(josa('재물운', '은', '는')).toBe('은')
    expect(josa('사고수', '은', '는')).toBe('는')
    expect(josa('확장과 기회', '이', '가')).toBe('가')
    expect(josa('변환', '이', '가')).toBe('이')
  })

  it('ignores trailing hanja and brackets', () => {
    expect(josa('편재(偏財)', '이', '가')).toBe('가')
    expect(josa('편관(偏官)', '이', '가')).toBe('이')
  })

  it('empty and non-Hangul input fall back to the vowel form', () => {
    expect(josa('', '이', '가')).toBe('가')
    expect(josa('ABC 123', '이', '가')).toBe('가')
  })
})
