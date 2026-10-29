# threeyear-fortune

A free, stateless 3-year fortune (saju, 사주) calculator for Korean users.
Enter a birth date and time (solar or lunar). The page shows the four pillars and compares this year, next year, and the year after in three columns.

**For fun and reference only.** The result is not a guarantee. Do not use it alone for medical, financial, or legal decisions.

## Privacy

- All calculation runs in the browser. There is no server and no API.
- The page does not store birth data: no `localStorage`, no cookies, no analytics, no network request after load.
- The Korean web font is self-hosted. No third-party font request is made.

## License

MIT (see `LICENSE`). Every file in this repository is either original work under MIT or a third-party MIT-licensed component listed below.
The engine in `src/engine/` was written from public formulas and public saju rules. Its behaviour was checked against recorded reference outputs in `fixtures/oracle.json` (inputs and expected results only; no source code of any reference implementation is included).

## Develop

```bash
npm ci
npm run dev      # local dev server
npm test         # vitest, includes parity tests against fixtures/oracle.json
npm run build    # tsc --noEmit && vite build -> dist/
```

## Layout

| Path | Content |
|---|---|
| `threeyear-site/` | The site: form, pillar table, 3-column comparison, charts |
| `src/engine/` | Pillar table, ascendant, cities, and time-zone helpers (original) |
| `src/threeyear/` | The 3-year calculation (deterministic, no DOM) |
| `src/vendor/fortuneteller/` | Vendored saju engine (MIT, Hoshin), see its `LICENSE` |
| `fixtures/` | Recorded reference outputs for parity tests |

## Third-party components

- `src/vendor/fortuneteller`: [hjsh200219/fortuneteller](https://github.com/hjsh200219/fortuneteller) (MIT, Hoshin), upstream commit `844d9f6`, local edits listed in its `LICENSE`.
- [lunar-javascript](https://www.npmjs.com/package/lunar-javascript) (MIT): lunar-solar conversion.
- [@photostructure/tz-lookup](https://www.npmjs.com/package/@photostructure/tz-lookup) (CC0-1.0), [date-fns](https://date-fns.org/) and date-fns-tz (MIT), React (MIT).
- Noto Sans KR (SIL OFL 1.1), self-hosted.
