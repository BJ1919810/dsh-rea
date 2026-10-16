/**
 * REA bundle skills as a DeepSeek Harness plugin.
 *
 * Contributes the three skills shipped in the REA repository's `.agents/skills`
 * directory as plugin-owned candidates, so enabling or disabling this plugin in
 * the plugin manager adds or removes them without touching any skill root.
 *
 * @module dsh-rea-skills
 */
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/** Plugin entry id; must match the id used by cordis.patch.yml. */
export const name = 'rea-skills';

/** The provider registry this plugin contributes to. */
export const inject = ['skills'];

/** Stable provider identity reported with every candidate. */
const PROVIDER = 'rea';

/** Packaged/bundled precedence; equal rank loses to narrower project roots. */
const RANK = 600;

const INVOCATION = { modelInvocable: true, userInvocable: true };

/** Public skill-name grammar. */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/** Bundled skill directories, in catalog order. */
const SKILL_NAMES = ['reverse-engineer-anything', 'rea-tool-design', 'rea-changelog-update'];

function skillDirectory(skillName) {
  return fileURLToPath(new URL(`../skills/${skillName}/`, import.meta.url));
}

/**
 * Read the single-line `key: value` pairs of a SKILL.md YAML frontmatter block.
 * Only the fields this provider needs are read; the body stays authoritative for
 * everything else, and the frontmatter is removed before the content is served.
 */
function parseFrontmatter(raw, locator) {
  if (!raw.startsWith('---')) throw new Error(`rea-skills: ${locator} has no YAML frontmatter`);
  const end = raw.indexOf('\n---', 3);
  if (end === -1) throw new Error(`rea-skills: ${locator} has unterminated YAML frontmatter`);
  const values = {};
  for (const line of raw.slice(3, end).split('\n')) {
    const match = /^([A-Za-z][A-Za-z0-9_-]*):[ \t]*(.*)$/u.exec(line);
    if (match === null) continue;
    const value = match[2].trim();
    values[match[1]] = /^["'].*["']$/u.test(value) ? value.slice(1, -1) : value;
  }
  return values;
}

/** Remove the leading YAML frontmatter block, keeping the authored body. */
function stripFrontmatter(raw) {
  if (!raw.startsWith('---')) return raw;
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return raw;
  const bodyStart = raw.indexOf('\n', end + 1);
  return bodyStart === -1 ? '' : raw.slice(bodyStart + 1).replace(/^\n/u, '');
}

function readSkill(locator) {
  return readFileSync(locator, 'utf8');
}

const candidates = SKILL_NAMES.map((skillName) => {
  if (!SKILL_NAME.test(skillName)) throw new Error(`rea-skills: invalid skill name "${skillName}"`);
  const directory = skillDirectory(skillName);
  const locator = `${directory}SKILL.md`;
  const frontmatter = parseFrontmatter(readSkill(locator), locator);
  if (frontmatter.name !== skillName) {
    throw new Error(
      `rea-skills: ${locator} declares name "${frontmatter.name}", expected "${skillName}"`,
    );
  }
  if (frontmatter.description === undefined || frontmatter.description.length === 0) {
    throw new Error(`rea-skills: ${locator} has no description`);
  }
  return {
    name: skillName,
    description: frontmatter.description,
    invocation: INVOCATION,
    provider: PROVIDER,
    source: 'bundled',
    resourceBase: { kind: 'directory', path: directory },
    rank: RANK,
    locator,
  };
});

const provider = {
  name: PROVIDER,
  list: () => Promise.resolve(candidates),
  async get(candidate, options) {
    const { rank: _rank, locator, ...summary } = candidate;
    const raw = await readFile(locator, { encoding: 'utf8', signal: options?.signal });
    return { ...summary, content: stripFrontmatter(raw) };
  },
};

export function apply(ctx) {
  ctx.skills.registerProvider(() => provider);
}

export default { name, inject, apply };
