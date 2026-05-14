# Status

Current version: **0.1.0** (F1 complete)

## Phases

### F1 — Scaffolding ✅
- Repo structure created
- `package.json` with `bin: sfn-toolkit`
- CLI router with stubs for `new`, `rebrand`, `upgrade-check`, `patch`, `help`
- Skill manifest `skill/sfn-brand-demo/SKILL.md`
- Empty patches/v0.3/manifest.json
- README with end-to-end narrative

### F2 — Patches v0.3 + audit + apply 🚧
- Port `src/extensions/branding/` from feature/branding-extension into `patches/v0.3/extensions/branding/`
- Convert the 5 core edits (root.tsx, header, home route, config.server.ts, types/config.ts) into anchor-based patch descriptors at `patches/v0.3/core-edits/*.json`
- Implement `audit/version-drift.mjs`: read target's `package.json`, compare runtime version, run anchor regex against each patched file, report PASS/FAIL with diffs
- Implement `bin/sfn-toolkit.js patch <repo>`: applies the v0.3 bundle to a fresh clone; aborts if drift detected unless `--force`
- Test on a fresh clone of the upstream template

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
