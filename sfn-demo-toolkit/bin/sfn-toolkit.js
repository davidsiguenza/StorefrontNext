#!/usr/bin/env node
/**
 * sfn-toolkit — Salesforce Storefront Next demo toolkit
 *
 * Subcommands (stubbed in F1; implemented in F2-F5):
 *   new <client-id>          Bootstrap a new SFN clone, apply branding system, scrape URL, generate catalog
 *   rebrand                  Re-run branding pipeline on an existing client repo
 *   upgrade-check            Detect SFN version drift between target repo and toolkit patches
 *   patch <repo-path>        Apply branding system patches to a fresh SFN clone (no scrape)
 *   help                     Show usage
 */
import { argv, exit, stderr, stdout } from 'node:process';

const COMMANDS = ['new', 'rebrand', 'upgrade-check', 'patch', 'help'];

const usage = () => {
    stdout.write(`sfn-toolkit — Storefront Next demo toolkit

Usage:
  sfn-toolkit new <client-id> --url <site-url> [options]
  sfn-toolkit rebrand --target <repo-path> --url <site-url> --client-id <id>
  sfn-toolkit upgrade-check --target <repo-path>
  sfn-toolkit patch <repo-path>

Options (new):
  --url <url>                Customer website to scrape for branding
  --target <path>            Where to clone the SFN template (default: ./<client-id>)
  --catalog <industry>       Catalog template (fashion|food|beauty|generic). Default: generic
  --skip-clone               Skip git clone (target dir already has SFN)
  --skip-catalog             Skip catalog generation
  --skip-import              Skip catalog import to sandbox

Common:
  --version                  Print toolkit version
  --help                     Show this help

This toolkit is in early development. Most subcommands are stubs.
See https://github.com/davidsiguenza/sfn-demo-toolkit for status.
`);
};

const cmd = argv[2];

if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    usage();
    exit(0);
}

if (cmd === '--version' || cmd === '-v') {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(resolve(here, '..', 'package.json'), 'utf8'));
    stdout.write(`${pkg.version}\n`);
    exit(0);
}

if (!COMMANDS.includes(cmd)) {
    stderr.write(`Unknown command: ${cmd}\n\n`);
    usage();
    exit(1);
}

stderr.write(`[stub] '${cmd}' is not yet implemented (F2-F5).\n`);
exit(2);
