# sfn-demo-toolkit

Toolkit to bootstrap and brand Salesforce Storefront Next (SFN) demos for customers, end-to-end.

## What it does

Given a customer URL, the toolkit takes a fresh clone of the official Storefront Next template and turns it into a branded demo:

1. Clones the upstream SFN template
2. Applies the **branding system** (a non-invasive extension that exposes UI targets for logo, hero, featured content; switches by env var)
3. Scrapes the customer website (logo, colors, copy, imagery)
4. Generates `clients/<id>/content.ts` + `theme.css` + `.env.profiles/<id>.env`
5. Downloads logo and assets locally
6. (Optional) Generates a product catalog and imports it into a sandbox via b2c-cli
7. Boots `pnpm dev` for instant validation

Switching between client demos in dev is a single command: `pnpm demo:switch <clientId>`.

## Status

🚧 **Early development — v0.4.0**. F1-F3 working. See [docs/STATUS.md](./docs/STATUS.md) for current progress.

| Phase | Goal | Status |
|---|---|---|
| F1 | Toolkit scaffolding + skill skeleton | ✅ |
| F2 | Patches v0.3 + version drift audit + apply | ✅ |
| F3a | Crawler ported + `scrape` command | ✅ |
| F3b | Brand analysis pipeline → BrandContent | ✅ |
| F4 | Apply branding (per-client artifacts) | ⏳ |
| F5 | Catalog generation + sandbox import | ⏳ |
| F6 | Polish, docs, second-client validation | ⏳ |

## Install (when published)

```bash
npm install -g @davidsiguenza/sfn-demo-toolkit
```

For local development:

```bash
git clone https://github.com/davidsiguenza/sfn-demo-toolkit
cd sfn-demo-toolkit
npm link
sfn-toolkit --help
```

## Usage

### New client demo from scratch
```bash
sfn-toolkit new nike-2026 --url https://nike.com --catalog fashion
```

This produces `./nike-2026/` with a fully branded SFN clone running on `localhost:5173`.

### Rebrand an existing client repo
```bash
cd ~/clients/nike-2026
sfn-toolkit rebrand --url https://nike.com --client-id nike-2026
```

### Check version drift
```bash
sfn-toolkit upgrade-check --target ~/clients/nike-2026
```

Reports whether the target repo's SFN version matches the toolkit's patch bundle and lists any anchor mismatches.

## Architecture

```
sfn-demo-toolkit/
├── bin/sfn-toolkit.js        Main CLI router
├── skill/sfn-brand-demo/     Claude Code skill manifest
├── patches/v0.X/             Per-SFN-version patch bundles
│   ├── manifest.json         Anchor regex + supported version range
│   ├── extensions/branding/  The non-invasive extension
│   ├── core-edits/           Anchor-based instructions for core file edits
│   └── scripts/              demo-switch.mjs, etc.
├── crawler/                  URL scraping → branding proposal
├── catalog/                  Product catalog generator + b2c-cli importer
├── audit/                    Version drift detection
└── docs/                     Architecture, extending, troubleshooting
```

## License

Apache-2.0. See [LICENSE](./LICENSE).
