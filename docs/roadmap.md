# Roadmap

## 4.0

Breaking and additive 4.0 work is tracked in `CHANGELOG.md`. Remaining polish before release: test coverage for new features, docs alignment, and final review of new public behavior (manifest format, config validation strictness, CLI flags).

## Decisions

- File and class names stay as they are; the `svg-sprite` prefix is documented in `docs/conventions.md`.
- Default export stays a factory, matching upstream `svg-sprite`.
- Internal renames are patch-level: the `exports` map has no wildcard.
- Keep `./lib/svg-sprite/utils/index.js` as a legacy export alias in 4.0; revisit removal in a future major.
- No `./utils` subpath export; library helpers needed publicly are exported from the main entry.
- Keep `yargs` as a regular dependency while the CLI ships in this package; only the `bin/` entry imports it.
- 4.0 changes must be explicit in `CHANGELOG.md` and migration notes before release.
