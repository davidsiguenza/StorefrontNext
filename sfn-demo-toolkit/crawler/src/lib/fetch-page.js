import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

export async function fetchPage(url, options = {}) {
  const waitFor = Number(options.waitFor || 0);
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);

  if (isFileUrl(url)) {
    const html = await readFile(fileURLToPath(url), 'utf8');
    return {
      html,
      finalUrl: url,
      requestedUrl: url,
      status: 200,
      renderer: 'file',
    };
  }

  const rendered = await tryPlaywright(url, { waitFor, timeoutMs });
  if (rendered) {
    return rendered;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'accept': 'text/html,application/xhtml+xml',
        'user-agent': DEFAULT_USER_AGENT,
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    if (waitFor > 0) {
      await delay(waitFor);
    }

    return {
      html,
      finalUrl: response.url,
      requestedUrl: url,
      status: response.status,
      renderer: 'fetch',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchText(url, options = {}) {
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);

  if (isFileUrl(url)) {
    return readFile(fileURLToPath(url), 'utf8');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'accept': 'text/plain,text/css,*/*',
        'user-agent': DEFAULT_USER_AGENT,
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function tryPlaywright(url, options) {
  // Default to Playwright when available; opt out with WEBCRAWLER_NO_PLAYWRIGHT=1
  if (process.env.WEBCRAWLER_NO_PLAYWRIGHT) {
    return null;
  }

  try {
    const playwright = await loadOptionalModule('playwright');
    if (!playwright) {
      process.stderr.write(
        'note: playwright not installed; using native fetch (SPAs may not render). ' +
          'Install with: pnpm add -D playwright && npx playwright install chromium\n',
      );
      return null;
    }

    const chromium = playwright.chromium ?? playwright.default?.chromium;
    if (!chromium) {
      process.stderr.write('note: playwright module loaded but chromium export missing.\n');
      return null;
    }
    const browser = await chromium.launch({
      headless: true,
    });
    const page = await browser.newPage({
      userAgent: DEFAULT_USER_AGENT,
    });

    await page.goto(url, {
      timeout: options.timeoutMs,
      waitUntil: 'networkidle',
    });

    if (options.waitFor > 0) {
      await page.waitForTimeout(options.waitFor);
    }

    const html = await page.content();
    const finalUrl = page.url();
    await browser.close();

    return {
      html,
      finalUrl,
      requestedUrl: url,
      status: 200,
      renderer: 'playwright',
    };
  } catch (e) {
    const msg = String(e?.message ?? e);
    if (msg.includes("Executable doesn't exist")) {
      process.stderr.write(
        'note: playwright browser not installed; using native fetch (SPAs may not render). ' +
          'Install with: npx playwright install chromium\n',
      );
    } else {
      process.stderr.write(`note: playwright failed (${msg.split('\n')[0]}); using native fetch.\n`);
    }
    return null;
  }
}

function isFileUrl(value) {
  return typeof value === 'string' && value.startsWith('file://');
}

async function loadOptionalModule(specifier) {
  const entrypoints = [];

  try {
    entrypoints.push(createRequire(import.meta.url).resolve(specifier));
  } catch {
    // Ignore local resolution failures.
  }

  try {
    entrypoints.push(createRequire(path.join(process.cwd(), 'package.json')).resolve(specifier));
  } catch {
    // Ignore cwd resolution failures.
  }

  for (const entrypoint of new Set(entrypoints)) {
    try {
      return await import(entrypoint);
    } catch {
      // Try the next resolution target.
    }
  }

  return null;
}
