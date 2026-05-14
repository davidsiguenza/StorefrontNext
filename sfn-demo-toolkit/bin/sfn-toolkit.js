#!/usr/bin/env node
/**
 * sfn-toolkit — Salesforce Storefront Next demo toolkit
 */
import { argv, exit, stderr, stdout } from 'node:process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRuntimeVersion, isVersionSupported, auditAnchors, summarizeAudit } from '../audit/version-drift.mjs';
import { applyManifest } from '../audit/apply-patches.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOOLKIT_ROOT = resolve(__dirname, '..');
const COMMANDS = ['new', 'rebrand', 'upgrade-check', 'patch', 'scrape', 'help'];

function parseArgs(args) {
    const out = { _: [] };
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a.startsWith('--')) {
            const key = a.slice(2);
            const next = args[i + 1];
            if (next && !next.startsWith('--')) {
                out[key] = next;
                i++;
            } else {
                out[key] = true;
            }
        } else {
            out._.push(a);
        }
    }
    return out;
}

function loadManifestFor(version) {
    const major = version.split('.').slice(0, 2).join('.');
    const dir = resolve(TOOLKIT_ROOT, 'patches', `v${major}`);
    const manifestPath = resolve(dir, 'manifest.json');
    if (!existsSync(manifestPath)) {
        throw new Error(`No patch bundle for SFN ${major}.x at ${dir}`);
    }
    return { manifest: JSON.parse(readFileSync(manifestPath, 'utf8')), patchesRoot: dir };
}

function usage() {
    stdout.write(`sfn-toolkit — Storefront Next demo toolkit

Usage:
  sfn-toolkit new <client-id> --url <site-url> [options]
  sfn-toolkit rebrand --target <repo-path> --url <site-url> --client-id <id>
  sfn-toolkit upgrade-check --target <repo-path>
  sfn-toolkit patch <repo-path> [--force]
  sfn-toolkit scrape <url> [--out <dir>] [--no-playwright] [--wait-for <ms>]

Options:
  --target <path>            Target SFN repo (default: cwd)
  --force                    Apply even if drift detected
  --out <dir>                Output dir for scrape artifacts (default: .sfn-toolkit/scrape)
  --no-playwright            Skip Playwright fetcher (use native fetch)
  --wait-for <ms>            Wait N ms after page load (Playwright only)
  --version                  Print toolkit version
  --help                     Show this help
`);
}

const cmd = argv[2];

if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    usage();
    exit(0);
}

if (cmd === '--version' || cmd === '-v') {
    const pkg = JSON.parse(readFileSync(resolve(TOOLKIT_ROOT, 'package.json'), 'utf8'));
    stdout.write(`${pkg.version}\n`);
    exit(0);
}

if (!COMMANDS.includes(cmd)) {
    stderr.write(`Unknown command: ${cmd}\n\n`);
    usage();
    exit(1);
}

const args = parseArgs(argv.slice(3));

if (cmd === 'upgrade-check') {
    const target = resolve(args.target ?? args._[0] ?? '.');
    try {
        const runtimeVersion = readRuntimeVersion(target);
        const { manifest } = loadManifestFor(runtimeVersion);
        const supported = isVersionSupported(runtimeVersion, manifest.supportedRuntimeVersions);
        const audit = summarizeAudit(auditAnchors(target, manifest));

        stdout.write(`Target: ${target}\n`);
        stdout.write(`SFN runtime: ${runtimeVersion} (${supported ? 'supported' : 'UNSUPPORTED'})\n`);
        stdout.write(`Anchors: ${audit.total - audit.failed}/${audit.total} found\n\n`);

        for (const r of audit.results) {
            const icon = r.found ? '✅' : '❌';
            const reason = r.reason ? ` — ${r.reason}` : '';
            stdout.write(`  ${icon} ${r.path} [${r.op}]${reason}\n`);
        }

        if (audit.ok && supported) {
            stdout.write('\nReady to patch.\n');
            exit(0);
        }
        stdout.write('\nDrift detected. Patch may not apply cleanly.\n');
        exit(3);
    } catch (e) {
        stderr.write(`Error: ${e.message}\n`);
        exit(1);
    }
}

if (cmd === 'patch') {
    const target = resolve(args._[0] ?? args.target ?? '.');
    const force = !!args.force;
    try {
        const runtimeVersion = readRuntimeVersion(target);
        const { manifest, patchesRoot } = loadManifestFor(runtimeVersion);
        const supported = isVersionSupported(runtimeVersion, manifest.supportedRuntimeVersions);
        const audit = summarizeAudit(auditAnchors(target, manifest));

        if ((!supported || !audit.ok) && !force) {
            stderr.write(`Drift detected (supported=${supported}, anchors=${audit.total - audit.failed}/${audit.total}).\n`);
            stderr.write(`Run \`sfn-toolkit upgrade-check --target ${target}\` for details, or rerun with --force.\n`);
            exit(3);
        }

        stdout.write(`Applying v${manifest.sfnVersion} patches to ${target} ...\n`);
        const log = applyManifest(patchesRoot, target, manifest);
        stdout.write(`  + Added ${log.addedDirs.length} dir(s), ${log.addedFiles.length} file(s)\n`);
        stdout.write(`  + Patched ${log.patchedFiles.length} file(s)\n`);
        stdout.write('\nDone. Next steps:\n');
        stdout.write('  pnpm install\n');
        stdout.write('  pnpm dev   # verify <html data-brand="default"> and home renders unchanged\n');
        exit(0);
    } catch (e) {
        stderr.write(`Error: ${e.message}\n`);
        exit(1);
    }
}

if (cmd === 'scrape') {
    const url = args._[0];
    if (!url) {
        stderr.write('Error: missing URL.\nUsage: sfn-toolkit scrape <url> [--out <dir>] [--no-playwright]\n');
        exit(1);
    }
    if (args['no-playwright']) {
        process.env.WEBCRAWLER_NO_PLAYWRIGHT = '1';
    }
    const outDir = resolve(args.out ?? '.sfn-toolkit/scrape');
    try {
        const { mkdirSync, writeFileSync } = await import('node:fs');
        const { createScrapePayload } = await import('../crawler/src/lib/scrape-pipeline.js');
        mkdirSync(outDir, { recursive: true });
        stderr.write(`Fetching ${url} ...\n`);
        const payload = await createScrapePayload({
            url,
            waitFor: args['wait-for'] ? Number(args['wait-for']) : 0,
            onlyMainContent: false,
        });
        const jsonPath = resolve(outDir, 'page.json');
        const htmlPath = resolve(outDir, 'page.html');
        const mdPath = resolve(outDir, 'page.md');
        writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
        writeFileSync(htmlPath, payload.html);
        writeFileSync(mdPath, payload.markdown);
        stdout.write(`Final URL: ${payload.finalUrl}\n`);
        stdout.write(`Images found: ${payload.images.length}\n`);
        stdout.write(`Output: ${outDir}\n  - page.json (full payload)\n  - page.html (raw)\n  - page.md (markdown)\n`);
        exit(0);
    } catch (e) {
        stderr.write(`Error: ${e.message}\n`);
        exit(1);
    }
}

stderr.write(`[stub] '${cmd}' is not yet implemented (F3+).\n`);
exit(2);
