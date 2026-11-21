# Roadmap

## 4.0 release candidates

Breaking/unreleased work already staged in `CHANGELOG.md`: CLI integrated into the package, vinyl replaced by plain file objects, `@resvg/resvg-js` optional peer dependency.

| Item | Type | Status | Notes |
| --- | --- | --- | --- |
| Promise-only `compile`/`getShapes` API | breaking | in branch | Callback form removed; `compileAsync` removed; `compile()`/`getShapes()` return Promises. CLI/docs/tests updated on `feature/v4-release-polish`. |
| Named exports | additive | in branch | Main entry exports `createSpriter`, `SVGSpriter`, and error classes; default factory kept. |
| TypeScript declarations | additive | in branch | Added `types/index.d.ts`, `types/utils.d.ts`, and `types`/exports map conditions. Needs validation against real consumers. |
| Legacy utils alias | compat | decided (keep) | Keep `./lib/svg-sprite/utils/index.js` export alias in 4.0 for svg-sprite migration compat; revisit removal in a future major. |
| Public spriter stats/getters | additive | in branch | Added `limit`, `dimensionSkipped`, `errorSkipped` getters; underscore fields remain for now. |
| Config/logger contract docs | docs | in branch | Documented `config.log` values/interface in `docs/configuration.md`. `SVGSpriterConfig` remains internal by convention. |
| CLI dependency cost | packaging | decided (keep) | Keep `yargs` as a regular dependency: CLI is integrated and only the `bin/` entry imports it; library imports do not load CLI deps. Revisit only if package split returns. |
| 4.0 docs pass | docs | in branch | README/API/config/templating anchors updated for Promise API and stale 4.x resvg note removed; full docs sweep still pending. |

## Decisions

- File and class names stay as they are; the `svg-sprite` prefix is documented in `docs/conventions.md`.
- Default export stays a factory, matching upstream `svg-sprite`.
- Internal renames are patch-level: the `exports` map has no wildcard.
- 4.0 changes must be explicit in `CHANGELOG.md` and migration notes before release.
