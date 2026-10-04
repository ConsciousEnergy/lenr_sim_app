#!/usr/bin/env node
/**
 * CI security gate: fail on high/critical npm advisories, with an explicit
 * allowlist for issues that have no upstream patched release yet.
 *
 * Transitive dependents of an allowlisted advisory (npm marks them "high"
 * via a string reference) are ignored once every underlying GHSA is allowed.
 *
 * Usage: node scripts/audit-high-gate.js
 */
const { spawnSync } = require('child_process');

// GHSA-vfj7-8cjw-p6xm — braces <=3.0.3; first_patched_version is null on the
// registry (2026-10-02). Removing braces requires a Tailwind v4 / chokidar v4
// migration; track separately and drop this id once braces publishes a fix.
const ALLOWED_HIGH_GHSA = new Set(['GHSA-VFJ7-8CJW-P6XM']);

const result = spawnSync('npm', ['audit', '--json'], {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});

let report;
try {
  report = JSON.parse(result.stdout || '{}');
} catch (err) {
  console.error('Failed to parse npm audit JSON:', err.message);
  process.exit(1);
}

const vulns = report.vulnerabilities || {};

const ghsaFromVia = (item) => {
  if (!item || typeof item !== 'object') return null;
  const url = item.url || '';
  const match = url.match(/GHSA-[a-z0-9-]+/i);
  return match ? match[0].toUpperCase() : null;
};

/** Resolve package name -> set of GHSA ids (direct + transitive via strings). */
const memo = new Map();
const resolveGhsas = (name, stack = new Set()) => {
  if (memo.has(name)) return memo.get(name);
  if (stack.has(name)) return new Set();
  stack.add(name);

  const entry = vulns[name];
  const ids = new Set();
  if (!entry || (entry.severity !== 'high' && entry.severity !== 'critical')) {
    memo.set(name, ids);
    return ids;
  }

  for (const via of entry.via || []) {
    if (typeof via === 'string') {
      for (const id of resolveGhsas(via, stack)) ids.add(id);
      continue;
    }
    const id = ghsaFromVia(via);
    if (id) ids.add(id);
  }

  memo.set(name, ids);
  return ids;
};

const blocking = [];
const allowed = [];

for (const [name, entry] of Object.entries(vulns)) {
  if (entry.severity !== 'high' && entry.severity !== 'critical') continue;

  const ids = [...resolveGhsas(name)];
  if (ids.length === 0) {
    // High without a resolvable GHSA — treat as blocking for safety.
    blocking.push({ name, severity: entry.severity, ghsaIds: ['<unresolved>'] });
    continue;
  }

  const record = { name, severity: entry.severity, ghsaIds: ids };
  if (ids.every((id) => ALLOWED_HIGH_GHSA.has(id))) allowed.push(record);
  else blocking.push(record);
}

if (allowed.length) {
  console.log('Allowlisted high/critical advisories (no upstream patch yet):');
  const seen = new Set();
  for (const item of allowed) {
    const key = item.ghsaIds.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`  - ${item.ghsaIds.join(', ')} (via ${item.name} and dependents)`);
  }
}

if (blocking.length) {
  console.error('Blocking high/critical advisories:');
  for (const item of blocking) {
    console.error(`  - ${item.name} (${item.severity}): ${item.ghsaIds.join(', ')}`);
  }
  process.exit(1);
}

console.log('Security gate passed (no blocking high/critical advisories).');
process.exit(0);
