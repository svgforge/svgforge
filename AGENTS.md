# AGENTS.md — svgforge

Ziele und Konventionen für die Weiterarbeit an diesem Projekt. Diese Datei
fasst bisherige Entscheidungen, den Testaufbau und den aktuellen Arbeitsstand
zusammen, damit nicht bei jedem neuen Agenten bei null angefangen wird.

## Wichtige Regeln (nutzerdefiniert, bitte strikt einhalten)

- **Es gibt KEIN Jest.** Das gesamte Testprojekt wurde von Jest auf
  `node --test` portiert. In den Testdateien dürfen keine `jest.*`-Aufrufe
  (`jest.mock`, `jest.doMock`, `jest.fn`, `jest.spyOn`, …) mehr vorkommen.
- **Es darf KEIN less/stylus geben.** Alle less/styl-Support wurde entfernt
  (Code, Dependencies, Doku). Nicht wieder einführen.
- Mock-Helfer, die in von mir geänderten Dateien einen Mock erzeugen, heißen
  `createMock()` (Statt `jest.fn()`), und Spy-Aufrufe heißen `spyOn(...)`
  (statt `jest.spyOn(...)`). Variablen, die einen Mock referenzieren, heißen
  `mockXxx` (z. B. `mockFixXMLString`, `mockShape`, `mockMinifyBlock`).
  `createMock()` und `spyOn()` werden aus `test/helpers/jest-compat.js`
  exportiert. Der `jest`-Namespace existiert nur noch intern in
  `jest-compat.js` (als Kompatibilitätsschicht), nicht in Testdateien.
- CHANGELOG.md enthält historische less/styl-Einträge und bleibt unangetastet
  (historisches Protokoll).

## Test-Framework

- Testrunner: `node --test` (package.json: `node --test test/*.test.js test/**/*.test.js`)
- **Wichtig – Shell-Glob-Falle:** `test/**/*.test.js` expandiert nur in Shells
  mit rekursivem Glob (`**`), z. B. zsh. Unter `sh`/`dash` (das `npm test`
  verwendet) wird `**` NICHT rekursiv expandiert, sodass `npm test` nur einen
  Bruchteil der Tests findet (~149 statt aller). Für einen vollständigen Lauf
  in zsh: `node --test test/*.test.js test/**/*.test.js` direkt ausführen.
- Kompatibiltätsschicht: `test/helpers/jest-compat.js` implementiert `describe`,
  `it`, `expect`, `createMock` (alias `makeMock`), `spyOn`, sowie die
  asymmetric matcher `expect.any`/`expect.objectContaining`/… und
  Snapshot-Helfer. Es implementiert bewusst KEIN `jest.mock` / `jest.doMock`.

## Dependency-Injection statt jest.mock / jest.doMock

`jest.mock`/`jest.doMock` existiert nicht (Node-Modul-Mocking). Ersatz:
`lib/deps.js` (`setDependency`, `getDependency(name, fallback)`,
`resetDependencies()`).

Damit eine Stelle mockbar ist, muss sie in der Produktionsdatei über
`getDependency(...)` geladen werden. Diese Stellen sind inzwischen umgestellt:

- `lib/svg-sprite/shape.js`:
  - Zeile ~328: `getDependency('fixXMLString', fixXMLString)` (in
    `-_initSVG`). → Test setzt `setDependency('fixXMLString', mockFixXMLString)`.
  - `getDependency('csso', require('csso'))` (bei `minifyBlock`).
    → `setDependency('csso', {minifyBlock: mockMinifyBlock})`.
  - `getDependency('cssom', cssom).parse(...)` (Zeile ~791).
    → `setDependency('cssom', {parse: () => ({cssRules: ''})})`.
  - `getDependency('xpath', xpath).useNamespaces(...)` (Zeile ~683).
- `lib/svg-sprite/layouter.js:145`:
  `getDependency('layouter:layoutModes', layoutModes)[mode]`.
  → `setDependency('layouter:layoutModes', mockModes)`.
- `lib/svg-sprite/queue.js:52`:
  `getDependency('queue:Shape', Shape)`.
  → `setDependency('queue:Shape', mockShape)`.
- `lib/svg-sprite/utils/calculate-svg-dimensions.js:19`:
  `getDependency('@resvg/resvg-js', {Resvg: defaultResvg})`.

## Wichtiger Matcher-Bug (behoben, aber nicht umkehren)

`expect.any(String)`, `expect.any(Number)`, … verwenden intern `instanceof`,
das für JS-Primitives (`'css'`, `1`) `false` liefert! Der Fix liegt in
`test/helpers/jest-compat.js` in `class Any`:
`expect.any(String/Number/Boolean/Symbol/BigInt/Function/Array/Object)` prüfen
nun korrekt. Ohne diesen Fix schlagen alle Tests fehl, die
`expect.any(String)` für Primitives nutzen (z. B. layouter "should pass
expected config and data to layout").

## Pixelmatch-Upgrade (v5 → v7) — aktueller Stand

- Grund: `svgo@4.1.0` verlangt `pixelmatch@^7.2.0`; die alte installierte
  `5.3.0` war invalid (npm ELSPROBLEMS).
- `package.json` hat jetzt `"pixelmatch": "^7.2.0"` und pnpm installiert 7.2.0.
  Der Dependency-Konflikt mit svgo4 ist damit aufgelöst.
- API: Die Signatur von `pixelmatch(img1, img2, output, width, height,
  options)` ist in v7 unverändert. `test/helpers/compare-png-2-png.js` braucht
  daher keinen API-Umbau (Aufruf bleibt gültig).
- **Verhaltensänderung v5→v7:** `checkerboard`/AA/Vergleichslogik ändert sich.
  Einige visuelle Tests, deren erwartete PNGs unter v5 erzeugt wurden, melden
  jetzt kleine Pixel-Differenzen z. B.:
  - `mixed.test.js` (2 Fehler)
  - `minimal-configuration/modes/defs.test.js` («w/o dims»: `Received: 113
    mismatches` bei `MAX_MISMATCH = 5`)
  - `minimal-configuration/modes/symbol.test.js` (1 Fehler)
  - (stack + view.packed + center ggf. grün in Einzelläufen)
- **Entscheidung (abgeschlossen):** **pixelmatch beibehalten und Toleranz
  anpassen** (nicht auf `@playwright/test`/`toHaveScreenshot` umsteigen).
  Playwright (`playwright-chromium`) wird bereits für die Screenshot-
  Erzeugung (SVG→PNG, HTML→PNG) verwendet; pixelmatch macht nur den finalen
  Pixel-Pixel-Vergleich in `test/helpers/compare-png-2-png.js`.
- **Root Cause der Restdifferenzen:** Die 113 abweichenden Pixel sind KEIN
  Checkerboard-Artefakt. `checkerboard: false` änderte nichts. Es ist
  **Anti-Aliasing** an dünnen Linien (Bus-Fenster): das neuere Chromium rendert
  diese Kanten ~1px dunkler als die v5-Ära-Referenzbilder; die Pixel liegen als
  dünner Streifen am unteren Bildrand (y≈988–1023) und sind nur bei ~1000×
  Zoom in GIMP sichtbar (manuell verifiziert vom Nutzer).
- **Fix:** `MAX_MISMATCH` in `test/helpers/compare-png-2-png.js` von `5` auf
  `130` angehoben (113 nur bei defs/symbol; view.packed 6, mixed 10/9 liegen
  darunter). `includeAA: true` wurde ausprobiert und WIRKTE NICHT (nur 1/19
  grün → wieder entfernt), also ist die Erhöhung von `MAX_MISMATCH` der
  richtige Hebel. `checkerboard: false` bleibt gesetzt. Alle 6 visuellen
  Mode-/Alignment-Tests (defs, symbol, view.packed, stack, center, mixed) sind
  grün. Die Pfad-Signatur `comparePng2Png(input, expected)` und die Optionen
  `{threshold: 0.1}` sind unverändert.
- Pipeline: SVG-Modus → `compareSvg2Png` (convertSvg2Png per Playwright-
  Screenshot → comparePng2Png); HTML-Modus → `compareHtml2Png`
  (Browser-Screenshot → comparePng2Png). Details in
  `test/helpers/compare-svg-2-png.js` und `test/helpers/compare-html-2-png.js`.

## Stand der Test-Migration (jest → node:test + createMock/spyOn + deps)

Grün und abgeschlossen (keine `jest.*`-Referenzen mehr, alle Tests werden
pass (Einzellauf)):
- `test/svg-shape.test.js` (fixXMLString via deps)
- `test/calculate-svg-dimensions.test.js` (@resvg/resvg-js via deps)
- `test/svg-sprite/layouter.test.js` (layoutModes via deps; nutzt
  `expect.any(String)` → braucht den Matcher-Fix aus jest-compat)
- `test/svg-sprite/queue.test.js` (queue:Shape via deps; `should add events`
  via `listenerCount`; wichtige Erkenntnis: `spyOn(queue,'emit')` fällt auf die
  echte `emit` zurück → Reentry über den im Konstruktor gebundenen
  'remove'-Listener → zweiter `process()`-Lauf. Fix: `queue.emit = createMock()`
  verwenden statt `spyOn(queue,'emit')` im Fehlerpfad-Test.)
- `test/svg-sprite/shape/shape.references.test.js` (cssom via deps)
- `test/svg-sprite/shape/shape.svg.namespace.test.js` — **Migration ABGESCHLOSSEN**:
  alle `jest.fn()`/`jest.spyOn`/`jest.doMock('csso')` wurden durch
  `createMock()`/`spyOn`/den globalen `setDependency('csso', {minifyBlock:
  mockMinifyBlock})` ersetzt. Das `jest.doMock('csso', …)` im ersten Test wurde
  entfernt; der Test nutzt nun den globalen `mockMinifyBlock` (Zeile 16).
  9/9 Tests grün. **`spyOn` aus jest-compat basiert auf `makeMock`** und
  unterstützt `mockReturnValueOnce`/`mockReturnValue`/`mockImplementation`/
  `mock.calls` — für `jest.spyOn(xpath,'useNamespaces').mockReturnValueOnce(…)`
  und `jest.spyOn(shape.dom.documentElement,…)` direkt übertragbar.

Noch offen (in Arbeit):
- `test/svg-sprite/shape/shape.init-svg.test.js` — **Migration ABGESCHLOSSEN**
  (keine `jest.*`-Referenzen mehr; only `jest-compat.js`-Import bleibt). Es
  laufen 10/12; die 2 Fails sind **vorbestehende Test-/Parserprobleme, kein
  Migrationsthema**:
  - `should fill entities`: schlägt fehl mit
    `Doctype not allowed inside or after documentElement at position 5`.
    Grund: xmldom stellt `<!DOCTYPE>` mit `<!ENTITY>`-Kindern NACH dem Root-
    Element ab. `svgStart` matcht hier bereits (Zeile 320), also wird
    `fixXMLString` gar nicht aufgerufen und der Mock spielt keine Rolle. Der
    DOMParser-Pfad (shape.js Zeile 367) wirft → `new SVGShape(...)` wirft. Reiner
    Renderer-Unterschied, unabhängig von Jest→node:test.
  - `should set title and description accordingly to svg`: erwartet
    `<title>test title</title>` aber bekommt
    `<title xmlns="http://www.w3.org/2000/svg">…</title>` (Namespace wird
    ergänzt). Test müsste die Namespace-Variante akzeptieren.

## ES6-Class-Modernisierung (Prototype → class)

Der Großteil der Prototype-basierten `lib`-Dateien ist auf ES6-Classes portiert:
- `lib/svg-sprite/shape.js` → `class SVGShape`
- `lib/svg-sprite.js` → `class SVGSpriter extends EventEmitter`
- `lib/svg-sprite/mode/base.js` → `class SVGSpriteBase`
- `lib/svg-sprite/mode/standalone.js` → `class SVGSpriteStandalone extends SVGSpriteBase`
- `lib/svg-sprite/mode/defs.js` → `class SVGSpriteDefs extends SVGSpriteBase`
- `lib/svg-sprite/mode/stack.js` → `class SVGSpriteStack extends SVGSpriteBase`
- `lib/svg-sprite/mode/symbol.js` → `class SVGSpriteSymbol extends SVGSpriteBase`
- `lib/svg-sprite/mode/css.js` → `class SVGSpriteCss extends SVGSpriteBase` (Test: mixed 4/4, css 16/16)
- `lib/svg-sprite/mode/view.js` → `class SVGSpriteView extends SVGSpriteCss`
- `lib/svg-sprite/sprite.js` → bereits ES6 (Class-Fields-Muster)

**KRITISCHER Fallstrick (super()-Reihenfolge):** Der Base-Konstruktor ruft am
Ende `this._init()` auf (base.js Zeile 153). Dieser Aufruf passiert, bevor die
**Class-Fields der Subklasse** initialisiert sind (Class-Fields werden erst nach
Rückkehr aus `super()` gesetzt). Deshalb dürfen Werte, die während `_init()` (oder
einer anderen vom Base-Konstruktor ausgelösten Methode) gebraucht werden, NICHT als
Subklassen-Class-Field definiert werden. Stattdessen als **Prototype-Getter**:
- `mode`: `get mode() { return 'css'; }` (jede Mode-Subklasse)
- `tmpl`: `get tmpl() { return 'css'; }` (Base hat `get tmpl() { return 'common'; }`)
- `LAYOUT_*` (css): `get LAYOUT_VERTICAL() { return 'vertical'; }` etc.
Konkretes Symptom: Mit `LAYOUT_VERTICAL = 'vertical'` als Class-Field war
`this._displaceable` fälschlich `false` (da `this.LAYOUT_VERTICAL === undefined`
während `_init()`), wodurch Displaceable-Shapes nicht einberechnet wurden und die
Sprite-Höhe zu klein war (mixed: 344 statt 440 → visuelle Tests rot). Nach dem
Umstieg auf Getter wieder 440 → mixed 4/4 grün.

`view.js` erbt von `SVGSpriteCss`, verwendet aber CSS' `_buildSVG`-Überschreibung
und `_refineRootAttributes`. Die frühere Cross-Vererbung
`_initData: SVGSpriteStandalone.prototype._initData` war redundant
(Standalone überschreibt `_initData` nicht; es kommt nur aus Base) und wurde
beim Klassenumbau entfernt.

## Sonstiges / Warnungen

- Kein Git-Repository auf Projekt-Ebene (`svg-frag` ist kein Git-Repo).
  Änderungen sind nicht über `git diff` nachvollziehbar → vorsichtig
  editieren, ggf. Sicherungskopien in `/tmp`.
- pnpm-Workspace: `svgforge` (Hauptpaket) und `svgforge-cli`.
- Tests, die das echte `cssom`/`xpath` brauchen: erst via `getDependency`
  umgestellt werden (shape.js), damit `setDependency` im Test greift.
- Snapshot-Dateien: Legacy-Jest-`.snap` wurden gelöscht, es gelten die
  `.snap.json`-Gegenstücke. Bei Snapshot-Fehlern `.snap.json` ggf. mit
  Update-Flag neu generieren.
