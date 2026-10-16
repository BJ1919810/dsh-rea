/**
 * Smoke test for the dsh-rea-skills provider.
 *
 * Exercises the plugin the way the skill registry does: apply() registers a
 * provider factory, list() reports candidates, get() serves the authored body.
 * Run with `node test/smoke.mjs`.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const plugin = await import('../lib/index.js');

assert.equal(plugin.name, 'rea-skills');
assert.deepEqual(plugin.inject, ['skills']);

let registered;
const ctx = {
  skills: {
    registerProvider(factory) {
      registered = factory;
    },
  },
};

plugin.apply(ctx);
assert.equal(typeof registered, 'function', 'apply() must register one provider factory');

const provider = registered();
assert.equal(provider.name, 'rea');
assert.equal(typeof provider.list, 'function');
assert.equal(typeof provider.get, 'function');

const expected = ['reverse-engineer-anything', 'rea-tool-design', 'rea-changelog-update'];
const candidates = await provider.list();
assert.deepEqual(
  candidates.map((candidate) => candidate.name),
  expected,
);

for (const candidate of candidates) {
  assert.equal(candidate.provider, 'rea');
  assert.equal(candidate.source, 'bundled');
  assert.equal(candidate.rank, 600);
  assert.deepEqual(candidate.invocation, { modelInvocable: true, userInvocable: true });
  assert.equal(candidate.resourceBase.kind, 'directory');
  assert.ok(candidate.description.length > 20, `${candidate.name} needs a real description`);

  const skillFile = join(candidate.resourceBase.path, 'SKILL.md');
  assert.ok(existsSync(skillFile), `${skillFile} must exist`);
  assert.equal(candidate.locator, skillFile);

  const skill = await provider.get(candidate);
  assert.equal(skill.name, candidate.name);
  assert.equal(skill.description, candidate.description);
  assert.equal(skill.locator, undefined, 'locator must not leak into the served skill');
  assert.equal(skill.rank, undefined, 'rank must not leak into the served skill');
  assert.ok(!skill.content.startsWith('---'), 'frontmatter must be stripped');
  assert.ok(skill.content.includes('# '), `${candidate.name} body must keep its heading`);

  const authored = readFileSync(skillFile, 'utf8');
  assert.ok(
    authored.length > skill.content.length,
    'served content must be shorter than the file it was authored in',
  );
}

const rea = candidates.find((candidate) => candidate.name === 'reverse-engineer-anything');
const references = readdirSync(join(rea.resourceBase.path, 'references'));
assert.equal(references.length, 6, 'reverse-engineer-anything ships six references');
for (const reference of references) {
  assert.ok(reference.endsWith('.md'), `${reference} must be Markdown`);
  assert.ok(
    readFileSync(join(rea.resourceBase.path, 'references', reference), 'utf8').length > 500,
    `${reference} must carry real content`,
  );
}

console.log(`OK: ${candidates.length} candidates, ${references.length} references`);
