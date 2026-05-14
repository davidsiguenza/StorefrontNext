---
name: sfn-brand-demo
description: Build a branded Salesforce Storefront Next demo for a specific customer. Clones the official SFN template, applies the branding system patches, scrapes the customer website, generates content/theme/profile per client, and (optionally) generates and imports a product catalog. Use when the user says "create a Storefront Next demo for <customer>", "brand a SFN demo from a URL", "set up a new SFN client", or similar. Powered by the sfn-demo-toolkit (https://github.com/davidsiguenza/sfn-demo-toolkit).
---

# SFN Brand Demo Skill

This skill orchestrates a complete Storefront Next demo build for a customer.
It is the user-facing wrapper around the `sfn-toolkit` CLI.

## When to invoke

The user is asking to spin up a Storefront Next storefront customized for a specific customer (often by URL). Examples:
- "Create a SFN demo for nike.com"
- "I need a branded Storefront Next demo for Acme"
- "Bootstrap a new client demo from this URL"

If the user only wants to rebrand an existing repo (already cloned), use the `rebrand` flow instead of `new`.

## Inputs to gather

Before doing anything, ask the user (use AskUserQuestion):

1. **Customer URL** — the public site to scrape for branding (e.g. https://nike.com)
2. **Client id** — short kebab-case slug (e.g. `nike-2026`)
3. **Target folder** — where to clone (default: current working dir + `/<client-id>`)
4. **Catalog industry** — fashion/food/beauty/generic (or skip)
5. **Sandbox credentials** — only if catalog import is requested

## Flow (skill orchestrates)

1. **Pre-check**: confirm sfn-toolkit is installed (`sfn-toolkit --version`). If not, show install instructions and stop.

2. **Clone**: `sfn-toolkit new <client-id> --url <url> --target <path>` does:
   - `git clone storefront-next-template <target>`
   - Audits SFN version vs supported patches
   - If drift detected, surface diff and ASK USER before continuing

3. **Apply branding system**: same `sfn-toolkit new` step continues:
   - Applies `patches/v0.X/` to the target repo
   - Adds `src/extensions/branding/`, demo-switch script, .env.profiles/

4. **Scrape & propose**: runs the crawler:
   - Reads the URL, extracts logo/colors/copy/imagery
   - Writes `<target>/.webcrawler/<clientId>/analysis.json` + `preview.html`
   - **STOP and present the proposal to the user via AskUserQuestion** — let them tweak before applying

5. **Apply branding**: writes `clients/<clientId>/content.ts`, `theme.css`, `.env.profiles/<clientId>.env`. Downloads logo to `public/images/brands/<clientId>/`.

6. **Catalog (optional)**: generates CSVs, optionally imports via b2c-cli.

7. **Boot dev**: runs `pnpm install && pnpm dev` and reports `localhost:5173`.

## Important behaviors

- **Never overwrite** an existing client folder without explicit user confirmation.
- **Always commit** patches and per-client artifacts in separate commits with descriptive messages.
- **Surface version drift** clearly; if anchors fail, do NOT proceed silently — pause and ask.
- **Catalog credentials** (sandbox dw.json, SLAS) should only be requested when the user wants import; otherwise generate CSVs and stop.

## After-skill checklist for the user

- Verify `<html data-brand="<clientId>">` in DevTools
- Verify hero/cards content matches the proposal
- Verify primary color reflects the scraped palette
- If catalog imported: visit `/category/root` and confirm products
