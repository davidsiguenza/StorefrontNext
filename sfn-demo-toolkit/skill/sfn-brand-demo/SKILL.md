---
name: sfn-brand-demo
description: Build a high-quality, branded Salesforce Storefront Next demo for a specific customer. Claude orchestrates the whole flow — clones the SFN template, applies the branding system patches via sfn-toolkit, then **personally curates** the per-client content (hero copy, featured cards, palette, real customer assets) instead of relying on heuristic scrapers. Use when the user says "create a Storefront Next demo for <customer>", "brand a SFN demo from a URL", "set up a new SFN client", or similar.
---

# SFN Brand Demo Skill

This skill turns a customer URL into a branded Storefront Next demo. The
**`sfn-toolkit` CLI** does the mechanical parts (cloning, patching, registering
files). **Claude does the creative parts** (reading the customer site,
selecting the right images, writing the copy, picking the palette).

## Core principle: Claude is the designer

The toolkit ships a heuristic scraper, but it produces poor results on most
modern sites (SPAs, lazy-loaded content, generic image filenames). **Don't rely
on it for content quality.** Use it only to discover assets; then write
`content.ts` and `theme.css` yourself with real care.

The full flow is:

```
[CLI: scaffold]    sfn-toolkit patch  →  branding extension installed
[CLAUDE: research] WebFetch + curl    →  understand brand, find images
[CLAUDE: curate]   write content.ts   →  Spanish/EN copy that matches the site
[CLAUDE: curate]   write theme.css    →  override brand-aware tokens
[CLAUDE: curate]   download assets    →  real customer images
[CLI: register]    sfn-toolkit apply  →  wires files into the repo
                   pnpm dev           →  validate visually
```

## Inputs to gather (use AskUserQuestion)

Before doing anything:

1. **Customer URL** (e.g. `https://www.mayoral.com/es/es/`) — the public site
2. **Client id** — short kebab-case slug (e.g. `mayoral`, `nike-2026`)
3. **Display name** — human-readable brand name
4. **Target folder** — where to clone (default: cwd + `/<client-id>`)
5. **Reuse existing sandbox?** — typically yes; ask the path to an existing
   working `.env` (e.g. `~/Documents/SFNenablement/DSPMarketStreet-zzpm048/.env`)
   so Claude can copy the SCAPI credentials with `--inherit-env`. If no, the
   user must fill them manually.

## Step-by-step playbook

### 1. Pre-check
- Confirm `sfn-toolkit --version` works. If not, link it: `cd <toolkit-repo> && npm link`.
- Ask the user the inputs above.

### 2. Scaffold the repo
```bash
git clone https://github.com/SalesforceCommerceCloud/storefront-next-template <target>
cd <target>
sfn-toolkit upgrade-check --target .   # confirm anchors found
sfn-toolkit patch .
```
If `upgrade-check` reports drift, **stop** and surface to the user — don't
force-apply on an unsupported version.

### 3. Research the brand (Claude does this)

Two complementary approaches:

a) **WebFetch the customer URL** with a structured prompt asking for:
   - brand positioning, target audience, tone
   - palette guess (often the LLM can only see textual content; that's OK)
   - hero/banner section copy and CTAs
   - featured categories and their copy
   - editorial/about block
   - slogan/claim
   - language and tone

b) **curl the URL directly** to get the raw HTML and:
   - Grep for `#[0-9a-fA-F]{6}` to find actual hex colors. The most-frequent
     vivid colour is usually the primary CTA.
   - Grep for asset URLs (`assets.<brand>.com`, `cdn.<brand>.com`,
     `<brand>.com/_next/image?url=...`) to find real image filenames
   - Look for the actual logo URL (often `<header>` or `<a class="logo">`)

> **Important:** the toolkit's `sfn-toolkit scrape` and `brand` commands
> exist but are weak on modern SPAs. Treat their output as a hint, not the
> source of truth.

### 4. Run the toolkit's brand command (optional, for hints)
```bash
sfn-toolkit brand <url> --client-id <id> --display-name "<name>"
```
This produces `.sfn-toolkit/brand/<id>/{analysis.json, brand-content.ts, theme.css, profile.env}`.

The `analysis.json` is useful as **evidence of what the scraper found** (image
URLs, color tokens picked up). The generated `brand-content.ts` is usually
poor — replace it.

### 5. Apply (registers files mechanically)
```bash
sfn-toolkit apply --target . --brand-dir .sfn-toolkit/brand/<id> \
  --inherit-env <path-to-existing-working-.env>
```
This:
- copies `brand-content.ts`, `theme.css`, `profile.env` into the right places
- registers the client in `registry.ts` and `themes.css`
- downloads the logo (if URL works) to `public/images/brands/<id>/logo.<ext>`
- bootstraps `.env` if missing (with credentials inherited if `--inherit-env`)

### 6. **Claude rewrites the curated content** (the heart of the skill)

After step 5 the registration is done but the content is mediocre. Now:

a) **Write `src/extensions/branding/clients/<id>/content.ts`** by hand, using
   the research from step 3:
   - Each hero slide: title in the brand's language, real subtitle from the
     site, real CTA text, link to a relevant category
   - Featured cards: pick the actual primary categories (boys/girls,
     newborn/teen, etc.). Use real category copy, not "Discover Women."
   - TextOnly card: use the brand's actual slogan or editorial line

b) **Download real assets** from the customer's CDN to
   `public/images/brands/<id>/`. Example for Mayoral:
   ```bash
   curl -sLA "<browser-UA>" \
     "https://assets.mayoral.com/.../mayoral-newborn-recien-nacido-v26.jpg" \
     -o public/images/brands/mayoral/hero-newborn.jpg
   ```
   Update `content.ts` `imageUrl` fields to `/images/brands/<id>/<filename>`.

c) **Rewrite `src/extensions/branding/clients/<id>/theme.css`** with proper
   token overrides. **CRITICAL** lessons learned (see
   `docs/CLAUDE-BRANDING-PLAYBOOK.md`):

   - `--accent` is the **hover/highlight** surface (outline buttons,
     dropdowns, hovered cards). It MUST be a low-saturation neutral. Putting
     a vivid brand color here makes every hover look broken.
   - `--primary` drives the main CTAs everywhere (Add to Cart, etc.)
   - For PDP swatches (variant selectors) override `--swatch-bg-selected`,
     `--swatch-border-selected`, `--swatch-text-selected`,
     `--swatch-color-border-hover`. Without this, swatches stay
     template-default black.
   - For "Write a Review"-type buttons override `--brand-primary` and
     `--brand-primary-hover`.
   - For the focus ring override `--ring` and `--focus`.
   - For mobile menus override `--sidebar-primary`, `--sidebar-ring`.
   - For non-default header styles (e.g. white instead of template's black),
     override the `--header-*` family AND set `--header-logo-filter: none`
     so the logo SVG renders with its native colors.

   Always check the brand's **PLP and PDP** visually after — that's where
   incomplete theming bites.

### 7. Validate
```bash
pnpm install   # if not already
pnpm demo:switch <id>
pnpm dev
```
Open `http://localhost:5173`. Walk through:
- **Home**: hero, featured cards, footer logo all show the brand
- **PLP**: hover state on product tiles is neutral, not coloured
- **PDP**: swatches, "Add to Cart", "Add to Wishlist" all in brand color

If something is off, iterate on `content.ts` / `theme.css` and refresh.

## Common pitfalls (Mayoral run, May 2026)

1. **Heuristic crawler picks up cookie banner content.** The `sfn-toolkit
   brand` command may extract OneTrust banner copy ("Remember my selection",
   "Click here") and trust badges (norton-certificate.png) as hero content
   on SPAs. Always replace.
2. **Header has TWO logo variants in v0.4** (mobile-simplified for checkout +
   desktop). The patch wraps both via `replace-anchor` with `all: true`.
3. **Footer logo is separate** from header — it has its own `UITarget`
   (`footer.logo`) and its own component (`branded-footer-logo.tsx`).
4. **`--accent` token is NOT a brand color.** It's the UI hover surface.
   Putting brand color there makes every hover look like an error.
5. **Logo SVGs already have brand colors** — when overriding the header for
   a brand whose logo isn't black, set `--header-logo-filter: none`.

## Output: a complete, branded demo

When done, the user can:
- `pnpm demo:switch <id>` to swap brands instantly in dev
- Add more clients without touching core code (just clone the same
  pattern in `clients/<new-id>/`)
- Upgrade SFN later (the patches are self-documented via
  `@sfdc-extension-line SFDC_EXT_BRANDING` markers)
