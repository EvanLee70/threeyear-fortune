# Five-system yearly fortune: design

The result page shows this year, next year, and the year after in three columns. Each year combines five systems.

| System | Module | Source of method | License of method/data |
|---|---|---|---|
| 명리 (saju) | `src/yearly/myeongri.ts` over `src/threeyear/compute.ts` | vendored saju engine + own pillar table | MIT |
| 자미두수 (Zi Wei) | `src/yearly/ziwei.ts` over `src/vendor/ziwei-nihai` | iztro + school data | MIT |
| 점성술 (astrology) | `src/yearly/astro.ts`, `src/engine/planets.ts` | astronomy-engine, public aspect rules | MIT |
| 토정비결 | `src/yearly/tojeong.ts`, `src/engine/tojeong.ts` | korean-fortune-system formula | Apache-2.0 (see NOTICE) |
| 주역 | `src/yearly/juyeok.ts`, `src/engine/juyeok.ts` | yarrow-stalk mathematics (written from scratch), 64-hexagram text | Apache-2.0 data (see NOTICE) |

## Contract

`src/yearly/types.ts`. Each system returns one `SystemYear` per target year: a score 0..100, a headline, fact chips,
optional graphs (bars, months, palaces, aspects, hexagram), a plain-language `explain` text for every graph, narrative
paragraphs, and short cautions. `src/yearly/index.ts` joins them; the composite is the simple mean of the available scores.
Scores of different systems are independent. The composite is a simple average, not a prediction.

## Rules

- Deterministic: the same input always gives the same result. No randomness, no network.
- Every graph is shown together with its explanation; a graph without an explanation is not rendered.
- Entertainment and reference only. No definitive claims about health, money, lawsuits, or medicine.
- Layout: full width with minimal side margins. From 768px the three years are three columns; below 768px they stack
  inside each section, in the same order.
- Clean-room: no code from copyleft projects. Parity and consistency tests use recorded reference outputs in `fixtures/`.
