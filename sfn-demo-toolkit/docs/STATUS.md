# Status

Current version: **0.5.0** (F1 + F2 + F3 + F4 complete; full branding flow end-to-end)

## Phases

### F1 — Scaffolding ✅
- Repo structure created
- `package.json` with `bin: sfn-toolkit`
- CLI router with stubs for `new`, `rebrand`, `upgrade-check`, `patch`, `help`
- Skill manifest `skill/sfn-brand-demo/SKILL.md`
- Empty patches/v0.3/manifest.json
- README with end-to-end narrative

### F2 — Patches v0.3 + audit + apply ✅
- Branding extension ported to `patches/v0.3/extensions/branding/` (default client only)
- 13 anchor-based patch descriptors in `patches/v0.3/manifest.json` covering 8 files
- 5 patch ops supported: `merge-json`, `insert-after-anchor`, `replace-anchor`, `wrap-anchor-block`, `append-if-missing`
- `audit/version-drift.mjs` validates runtime version + anchors; `audit/apply-patches.mjs` performs idempotent transforms
- `bin/sfn-toolkit.js upgrade-check` and `patch` fully wired (with `--force` override)
- Validated on fresh clone of `DSPMarketStreet-zzpm048@latest` (SFN 0.3.1):
  - 13/13 anchors found
  - Output identical to manually-patched reference (modulo JSON array indent — cosmetic)
  - `pnpm typecheck`: 131/131 baseline (zero new errors)

### F3a — Crawler ported + scrape command ✅
- Ported 17 crawler files from cc-b2c-sfnext-brand-demo (PORT + ADAPT). Dropped 3 (templates, apply-branding, brand-analyzer) that targeted the old fork-core architecture.
- Playwright is now the **default fetcher** (was env-gated before); falls back to native fetch with a clear note if Playwright or chromium binary missing
- Added `playwright ^1.50.0` as `optionalDependencies`
- New `sfn-toolkit scrape <url>` subcommand: writes `page.json`, `page.html`, `page.md` to `.sfn-toolkit/scrape/` (or `--out <dir>`)
- Flags: `--no-playwright`, `--wait-for <ms>`
- Validated on shop.tesla.com (30 images detected, Playwright renderer used)

### F3b — Brand analysis pipeline ✅
- New `crawler/src/lib/sfn-content-builder.js`: maps crawler analysis to `BrandContent` shape, renders `content.ts`, `theme.css`, `profile.env`
- New `crawler/src/lib/sfn-brand-pipeline.js`: clean pipeline without legacy `templates.js` / `apply-branding.js` dependencies
- New `sfn-toolkit brand <url> --client-id <id>` command: scrape + extract tokens + select slots + render artifacts
- Validated on shop.tesla.com: 4 hero slides, 2+textOnly featured cards, logo URL detected, color palette extracted (yellow primary, white bg, black fg, dark border), Playwright renderer
- Quality of extracted copy varies (slide 1 sometimes falls back to image URL as title); architectural baseline is solid, can iterate on heuristics later

### F4 — Apply branding ✅
- New `audit/apply-brand.mjs`: idempotent writer that takes a brand-dir (output of `brand` command) and copies it into a target SFN repo
- Downloads remote logo to `public/images/brands/<id>/logo.<ext>` (graceful: if 404 / network error, reports it but other steps continue)
- Rewrites `brand-content.ts` `logo.src` to the local path before writing
- Registers client in `registry.ts` (adds import + entry, idempotent)
- Registers theme in `themes.css` (adds @import, idempotent)
- Wired as `sfn-toolkit apply --target <repo> --brand-dir <dir>`
- End-to-end validated: fresh clone → `patch` → `brand https://shop.tesla.com` → `apply` → typecheck 131/131 baseline. Re-running `apply` is a no-op for registered files (idempotent).

### F5 — Catalog ⏳
- Generator (templates per industry: fashion, food, beauty, generic)
- Importer wrapper around b2c-cli site-import-export

### F6 — Polish ⏳
- End-to-end docs, troubleshooting playbook, demo gif
- Validate on a second client to confirm repeatability
