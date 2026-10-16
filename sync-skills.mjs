#!/usr/bin/env node
/**
 * Refresh skills/ from a REA checkout.
 *
 *   node sync-skills.mjs <path-to-rea-checkout>
 *
 * The upstream repository is the authority for these files; this package only
 * redistributes them (see NOTICE). After syncing, update NOTICE with the
 * version and commit printed below.
 */
import { execFileSync } from 'node:child_process';
import { cp, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = process.argv[2] ?? process.env.REA_REPO;

if (source === undefined || source === '') {
  process.stderr.write('usage: node sync-skills.mjs <path-to-rea-checkout>\n');
  process.exit(1);
}

const checkout = resolve(source);
const upstreamSkills = join(checkout, '.agents', 'skills');
if (!existsSync(upstreamSkills)) {
  process.stderr.write(`no .agents/skills directory in ${checkout}\n`);
  process.exit(1);
}

await cp(upstreamSkills, join(here, 'skills'), { recursive: true, force: true });

const readVersion = async () => {
  try {
    const manifest = JSON.parse(await readFile(join(checkout, 'package.json'), 'utf8'));
    return manifest.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
};

const readCommit = () => {
  try {
    return execFileSync('git', ['-C', checkout, 'rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
};

process.stdout.write(
  [
    `synced skills from ${upstreamSkills}`,
    `  upstream version : ${await readVersion()}`,
    `  upstream commit  : ${readCommit()}`,
    '  next             : update NOTICE with these values, then run `node test/smoke.mjs`',
    '',
  ].join('\n'),
);
