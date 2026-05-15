# Catalog scripts (reference implementation, Mayoral case study)

Reusable Python scripts that scrape a customer site, build a SFCC site
archive, and prep it for import into a sandbox. Used by the
[`sfn-brand-demo` skill](../skill/sfn-brand-demo/SKILL.md) during phase 5.

These scripts assume a Cloudinary-backed CDN (`assets.<brand>.com/images/...`)
and a Next.js storefront layout, which matches Mayoral and many other
modern retail sites. Adapt the regex patterns when the customer is not on
that stack.

## Pipeline

```
extract-products.py      PLP HTML  → products.json (variantId, slug, color, pdpUrl, views[1..N])
enrich-products.py       PDP HTML  → adds the missing views to products.json
download-images.py       Cloudinary → images/<vid>/<size>/<vid>-XL-<n>.jpg (5 sizes per view)
generate-archive.py      products.json + images/ → archive/<id>/{catalogs,pricebooks,inventory-lists,...}
generate-site-assignment.py  → archive/<id>/sites/<siteId>/preferences.xml  +  meta-data.xml
zip                       → ready for BM Site Import & Export
```

## Outputs

| File | Purpose |
|---|---|
| `catalogs/<id>/catalog.xml` | 5 categories + N products + assignments + 5 image-groups per product |
| `catalogs/<id>/static/default/images/<vid>/<size>/...` | All product images (4 sizes for galleries + swatch) |
| `pricebooks/pricebook.xml` | EUR list prices, heuristic by garment type |
| `inventory-lists/<id>.xml` | 50 units per product so PDPs show "in stock" |
| `sites/<siteId>/preferences.xml` | Pricebook bindings (catalog + inventory must be set in BM by hand) |
| `meta-data.xml` | Required at archive root |

## Manual steps (cannot be automated via site-import)

1. **Create the site in BM** before importing — the SFCC import job cannot
   create sites, only write data to existing ones.
2. **Assign storefront catalog and inventory list in BM** after importing —
   these are direct site attributes, not preferences.

## Schema gotchas

The site-import job validates each XML against XSD. From the Mayoral run:

- `<category>`: `<parent>` BEFORE `<position>`, not after.
- `<product>`: no `<available-flag>`. Use `<online-flag>` + `<searchable-flag>`.
- `<inventory-list>`: `list-id` goes on `<header>`, not on the list root.
- `<inventory><description>`: simple type — no `xml:lang`.
- `<preferences>`: pricebook bindings go in `<standard-preferences><all-instances>`.

See `docs/CLAUDE-BRANDING-PLAYBOOK.md` "Phase 5" for the full playbook.
