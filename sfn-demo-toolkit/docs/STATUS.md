# Status

Current version: **0.2.0** (F1 + F2 complete)

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

### F3 — Crawler ⏳
- Port `webcrawler/` from cc-b2c-sfnext-brand-demo, removing apply-branding.js
- Keep: fetch-page, dom, colors, select-from-json, overrides, preview, templates
- Adapt output paths to write under target repo's `.sfn-toolkit/<clientId>/`

### F4 — Apply branding ⏳
- Read crawler output (`analysis.json` + `overrides.json`)
- Write `src/extensions/branding/clients/<id>/content.ts`
- Write `src/extensions/branding/clients/<id>/theme.css`
- Write `.env.profiles/<id>.env`
- Append registry.ts and themes.css barrel
- Download logo to `public/images/brands/<id>/`

### F5 — Catalog ⏳
- Generator (templates per industry: fashion, food, beauty, generic)
- Importer wrapper around b2c-cli site-import-export

### F6 — Polish ⏳
- End-to-end docs, troubleshooting playbook, demo gif
- Validate on a second client to confirm repeatability
