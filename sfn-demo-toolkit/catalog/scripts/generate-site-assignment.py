"""
Build site preferences for an EXISTING Mayoral site.

The SFCC site-import job cannot create new sites — only data assigned to
existing ones. So the user creates the Mayoral site manually in Business
Manager (Administration > Sites > Manage Sites > New) before importing.

This script generates:
  - sites/Mayoral/preferences.xml — assigns the EUR pricebook
  - meta-data.xml — required at archive root

Storefront catalog assignment (mayoral-catalog → Mayoral) is also done in
BM after import: Administration > Sites > Mayoral > select 'mayoral-catalog'
as Storefront Catalog. We can't put that in preferences.xml because it's a
direct site attribute, not a preference.
"""
import shutil
from pathlib import Path

BASE = Path(__file__).resolve().parent
ARCHIVE = BASE / 'archive' / 'mayoral'

SITE_ID = 'Mayoral'
PRICEBOOK_ID = 'mayoral-list-prices-EUR'

PREFERENCES_XML = f'''<?xml version="1.0" encoding="UTF-8"?>
<preferences xmlns="http://www.demandware.com/xml/impex/preferences/2007-03-31">
    <standard-preferences>
        <all-instances>
            <preference preference-id="SiteAssignablePriceBooks">{PRICEBOOK_ID}</preference>
            <preference preference-id="SiteApplicablePriceBooks">{PRICEBOOK_ID}</preference>
        </all-instances>
    </standard-preferences>
</preferences>
'''

META_DATA_XML = '''<?xml version="1.0" encoding="UTF-8"?>
<metadata xmlns="http://www.demandware.com/xml/impex/metadata/2006-10-31">
</metadata>
'''


def main():
    site_dir = ARCHIVE / 'sites' / SITE_ID
    site_dir.mkdir(parents=True, exist_ok=True)

    # Per the b2c-cli site-import-export skill, preferences.xml lives directly
    # under sites/<SiteID>/, NOT under sites/<SiteID>/preferences/.
    (site_dir / 'preferences.xml').write_text(PREFERENCES_XML, encoding='utf-8')
    print(f'Wrote {site_dir / "preferences.xml"}')

    # Remove old preferences/ subdir if present from previous run
    nested = site_dir / 'preferences'
    if nested.exists():
        shutil.rmtree(nested)

    # Remove any stale site.xml from previous runs (we don't create sites here)
    stale_site = site_dir / 'site.xml'
    if stale_site.exists():
        stale_site.unlink()
        print(f'Removed {stale_site}')

    (ARCHIVE / 'meta-data.xml').write_text(META_DATA_XML, encoding='utf-8')

    # Remove DSPMarketStreet folder if it leaked from earlier runs
    dspms_dir = ARCHIVE / 'sites' / 'DSPMarketStreet'
    if dspms_dir.exists():
        shutil.rmtree(dspms_dir)
        print(f'Removed stale {dspms_dir}')

    print(f'Done. Archive expects an existing site "{SITE_ID}" in the sandbox.')


if __name__ == '__main__':
    main()
