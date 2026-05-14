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

🚧 **Early development — v0.5.0**. F1-F4 working: full branding pipeline end-to-end. See [docs/STATUS.md](./docs/STATUS.md).

| Phase | Goal | Status |
|---|---|---|
| F1 | Toolkit scaffolding + skill skeleton | ✅ |
| F2 | Patches v0.3 + version drift audit + apply | ✅ |
| F3a | Crawler ported + `scrape` command | ✅ |
| F3b | Brand analysis pipeline → BrandContent | ✅ |
| F4 | Apply branding (per-client artifacts) | ✅ |
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

### Quickstart: brand a new client end-to-end (F1-F4 working today)

```bash
# 1. Clone a fresh SFN template (or use an existing 0.3.x / 0.4.x clone)
git clone https://github.com/SalesforceCommerceCloud/storefront-next-template ~/clients/nike-demo
cd ~/clients/nike-demo

# 2. Apply the branding system (UI targets + extension + demo:switch script)
sfn-toolkit upgrade-check --target .   # confirm 13/13 anchors found
sfn-toolkit patch .

# 3. Scrape and analyze the customer site
sfn-toolkit brand https://nike.com --client-id nike --display-name "Nike"
# → produces .sfn-toolkit/brand/nike/{analysis.json,brand-content.ts,theme.css,profile.env,preview.html}

# 4. Apply the brand into the repo
sfn-toolkit apply --target . --brand-dir .sfn-toolkit/brand/nike
# This also copies .env.profiles/nike.env → .env if no .env exists yet,
# so step 6 below works out of the box.

# 5. Fill in SCAPI credentials in .env (clientId/organizationId/shortCode/secret/siteId)
#    The toolkit cannot guess these — get them from Account Manager + Business Manager.
#    Until you fill them in, `pnpm dev` will fail with "Missing shortCode in commerce.api".

# 6. Install + boot
pnpm install
pnpm dev
```

> **Tip — reusing an existing sandbox**: if you already have a working SFN repo
> for another client (e.g. DSPMarketStreet-zzpm048 with valid credentials),
> you can copy that `.env` into the new client repo to skip step 5 and validate
> the branding without setting up a fresh sandbox first.

### Other useful commands

```bash
sfn-toolkit scrape <url>                            # raw scrape (page.json/html/md)
sfn-toolkit upgrade-check --target <repo>           # detect SFN version drift
pnpm demo:switch <clientId>                         # swap the active client in dev
pnpm demo:list                                      # list available client profiles
```

### Coming soon (F5+)

```bash
sfn-toolkit new <client-id> --url <url> --catalog fashion   # one-shot: clone + patch + brand + apply + catalog
sfn-toolkit catalog generate --industry fashion --client nike
sfn-toolkit catalog import --target . --sandbox zzpm-048
```

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
