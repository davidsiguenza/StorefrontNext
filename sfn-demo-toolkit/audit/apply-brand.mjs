/**
 * Apply a generated brand bundle into a patched SFN repo.
 *
 * Inputs:
 *   - brandDir: output of `sfn-toolkit brand` (contains analysis.json,
 *     brand-content.ts, theme.css, profile.env)
 *   - targetRepo: SFN clone where `sfn-toolkit patch` was already applied
 *
 * Side effects (all idempotent):
 *   - Downloads remote logo into <repo>/public/images/brands/<id>/logo.<ext>
 *   - Rewrites brand-content.ts logo.src to the local path before writing
 *   - Writes <repo>/src/extensions/branding/clients/<id>/{content.ts,theme.css}
 *   - Writes <repo>/.env.profiles/<id>.env
 *   - Registers client in registry.ts and themes.css (idempotent)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, extname, dirname } from 'node:path';

const DEFAULT_USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

function ensureDir(p) {
    if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function readJson(p) {
    return JSON.parse(readFileSync(p, 'utf8'));
}

async function downloadLogo(remoteUrl, destDir) {
    if (!remoteUrl) return null;
    ensureDir(destDir);

    let response;
    try {
        response = await fetch(remoteUrl, {
            headers: { 'user-agent': DEFAULT_USER_AGENT, accept: 'image/*' },
            redirect: 'follow',
        });
    } catch (e) {
        return { error: `network: ${e.message}` };
    }

    if (!response.ok) {
        return { error: `status ${response.status}` };
    }

    const ct = (response.headers.get('content-type') || '').toLowerCase();
    let ext = extname(new URL(remoteUrl).pathname).split('?')[0];
    if (!ext) {
        if (ct.includes('svg')) ext = '.svg';
        else if (ct.includes('png')) ext = '.png';
        else if (ct.includes('webp')) ext = '.webp';
        else if (ct.includes('jpeg') || ct.includes('jpg')) ext = '.jpg';
        else ext = '.png';
    }
    if (!['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico'].includes(ext.toLowerCase())) {
        ext = '.png';
    }

    const buf = Buffer.from(await response.arrayBuffer());
    const logoPath = resolve(destDir, `logo${ext}`);
    writeFileSync(logoPath, buf);
    return { localPath: logoPath, ext };
}

function rewriteBrandContentLogo(brandContentTs, localLogoPath) {
    // Replaces the JSON value of logo.src with the local /images/brands/<id>/logo.<ext> URL.
    // The brand-content.ts file we render has a single `"src": "..."` line inside the logo object.
    const re = /("src"\s*:\s*)"[^"]*"/;
    if (!re.test(brandContentTs)) return brandContentTs;
    return brandContentTs.replace(re, (_m, prefix) => `${prefix}"${localLogoPath}"`);
}

function registerInRegistry(repoRoot, brandId) {
    const registryPath = resolve(repoRoot, 'src/extensions/branding/registry.ts');
    if (!existsSync(registryPath)) {
        throw new Error(`registry not found at ${registryPath}; did you run \`sfn-toolkit patch\` on this repo?`);
    }
    let content = readFileSync(registryPath, 'utf8');

    const importVar = `${brandId.replace(/-([a-z])/g, (_m, c) => c.toUpperCase())}Content`;
    const importLine = `import ${importVar} from './clients/${brandId}/content';`;
    const entryLine = `    ${brandId.includes('-') ? `'${brandId}'` : brandId}: ${importVar},`;

    let changed = false;
    if (!content.includes(importLine)) {
        content = content.replace(
            /(import defaultContent from '\.\/clients\/default\/content';)/,
            `$1\n${importLine}`,
        );
        changed = true;
    }
    if (!content.includes(`: ${importVar},`)) {
        content = content.replace(
            /(default: defaultContent,\s*\n)/,
            `$1${entryLine}\n`,
        );
        changed = true;
    }

    if (changed) writeFileSync(registryPath, content);
    return { changed };
}

function registerInThemesBarrel(repoRoot, brandId) {
    const themesPath = resolve(repoRoot, 'src/extensions/branding/themes.css');
    if (!existsSync(themesPath)) {
        throw new Error(`themes.css not found at ${themesPath}`);
    }
    let content = readFileSync(themesPath, 'utf8');
    const importLine = `@import './clients/${brandId}/theme.css';`;
    if (content.includes(importLine)) return { changed: false };
    content = content.trimEnd() + `\n${importLine}\n`;
    writeFileSync(themesPath, content);
    return { changed: true };
}

export async function applyBrand({ brandDir, targetRepo }) {
    brandDir = resolve(brandDir);
    targetRepo = resolve(targetRepo);

    const analysis = readJson(resolve(brandDir, 'analysis.json'));
    const brandContent = readJson(resolve(brandDir, 'brand-content.json'));
    const brandId = brandContent.id;
    if (!brandId) throw new Error('brand-content.json has no id');

    const log = { brandId, steps: [] };

    // 1. Logo download
    const remoteLogo = analysis.images?.logo;
    let localLogoUrl = brandContent.logo?.src ?? '';
    if (remoteLogo) {
        const publicDir = resolve(targetRepo, 'public/images/brands', brandId);
        const result = await downloadLogo(remoteLogo, publicDir);
        if (result?.localPath) {
            localLogoUrl = `/images/brands/${brandId}/logo${result.ext}`;
            log.steps.push({ step: 'logo', remote: remoteLogo, local: localLogoUrl });
        } else {
            log.steps.push({ step: 'logo', remote: remoteLogo, error: result?.error ?? 'unknown' });
        }
    } else {
        log.steps.push({ step: 'logo', skipped: 'no remote logo in analysis.images.logo' });
    }

    // 2. Write client folder
    const clientDir = resolve(targetRepo, 'src/extensions/branding/clients', brandId);
    ensureDir(clientDir);

    // 3. content.ts: rewrite logo.src to the local path before writing
    let contentTs = readFileSync(resolve(brandDir, 'brand-content.ts'), 'utf8');
    if (localLogoUrl) {
        contentTs = rewriteBrandContentLogo(contentTs, localLogoUrl);
    }
    writeFileSync(resolve(clientDir, 'content.ts'), contentTs);
    log.steps.push({ step: 'content.ts', path: `src/extensions/branding/clients/${brandId}/content.ts` });

    // 4. theme.css
    copyFileSync(resolve(brandDir, 'theme.css'), resolve(clientDir, 'theme.css'));
    log.steps.push({ step: 'theme.css', path: `src/extensions/branding/clients/${brandId}/theme.css` });

    // 5. profile.env
    const envProfileDir = resolve(targetRepo, '.env.profiles');
    ensureDir(envProfileDir);
    copyFileSync(resolve(brandDir, 'profile.env'), resolve(envProfileDir, `${brandId}.env`));
    log.steps.push({ step: 'profile.env', path: `.env.profiles/${brandId}.env` });

    // 6. registry.ts
    const registryResult = registerInRegistry(targetRepo, brandId);
    log.steps.push({ step: 'registry.ts', changed: registryResult.changed });

    // 7. themes.css
    const themesResult = registerInThemesBarrel(targetRepo, brandId);
    log.steps.push({ step: 'themes.css', changed: themesResult.changed });

    return log;
}
