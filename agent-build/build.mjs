#!/usr/bin/env node
/**
 * Build script: regenerate .claude/{agents,commands}/ and
 * .opencode/{agents,commands}/ from canonical bodies in Agents/ and
 * Commands/ combined with per-platform frontmatter from manifest.json.
 *
 * Usage:
 *   node agent-build/build.mjs            # write files
 *   node agent-build/build.mjs --check    # exit 1 if any output would change
 *   node agent-build/build.mjs --verbose  # log every file written
 *   node agent-build/build.mjs --prune    # also delete orphan files (not in manifest)
 *
 * Source of truth:
 *   - Bodies:      Agents/<name>.md, Commands/<name>.md
 *   - Frontmatter: agent-build/manifest.json
 *
 * Paths are resolved relative to the project root (parent of this script's
 * directory), so the script is portable across machines.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const CHECK = args.has('--check');
const VERBOSE = args.has('--verbose');
const PRUNE = args.has('--prune');

const TARGETS = {
  agents: {
    canonicalDir: 'Agents',
    claudeDir: '.claude/agents',
    opencodeDir: '.opencode/agents',
  },
  commands: {
    canonicalDir: 'Commands',
    claudeDir: '.claude/commands',
    opencodeDir: '.opencode/commands',
  },
};

// --- helpers -----------------------------------------------------------

function stripFrontmatter(text) {
  const m = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (!m) return text;
  return text.slice(m[0].length);
}

// Serialize a value to YAML. Handles strings (quoted only when needed),
// numbers, booleans, and one-level nested objects (sufficient for our manifest).
function yamlScalar(v) {
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  if (v === null || v === undefined) return '';
  const s = String(v);
  // Only quote when the string would not round-trip as a plain YAML scalar.
  // YAML reserved indicator chars at the start, or `: ` / `#` / newlines anywhere,
  // or leading/trailing whitespace, force a quoted form.
  const startsBad = /^[\-?:\[\]{}&*!|>'"%@`#,]/.test(s);
  const containsBad = / #|: |\n|\t/.test(s);
  const trimsBad = /^\s|\s$/.test(s);
  const isReserved = ['true', 'false', 'null', 'yes', 'no', 'on', 'off', '~'].includes(s.toLowerCase());
  const looksNumeric = /^-?\d+(\.\d+)?$/.test(s);
  const needsQuote = s === '' || startsBad || containsBad || trimsBad || isReserved || looksNumeric;
  if (!needsQuote) return s;
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function yamlKey(k) {
  // Quote keys that aren't plain identifiers (e.g. "*").
  if (/^[A-Za-z_][\w-]*$/.test(k)) return k;
  return `"${k.replace(/"/g, '\\"')}"`;
}

function emitFrontmatter(fm) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(fm)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      lines.push(`${yamlKey(k)}:`);
      for (const [k2, v2] of Object.entries(v)) {
        if (v2 && typeof v2 === 'object' && !Array.isArray(v2)) {
          lines.push(`  ${yamlKey(k2)}:`);
          for (const [k3, v3] of Object.entries(v2)) {
            lines.push(`    ${yamlKey(k3)}: ${yamlScalar(v3)}`);
          }
        } else {
          lines.push(`  ${yamlKey(k2)}: ${yamlScalar(v2)}`);
        }
      }
    } else {
      lines.push(`${yamlKey(k)}: ${yamlScalar(v)}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

function ensureDir(absDir) {
  fs.mkdirSync(absDir, { recursive: true });
}

let writes = 0;
let drifts = 0;
let pruned = 0;

function writeOrCheck(relPath, content) {
  const abs = path.join(ROOT, relPath);
  const existing = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  if (existing === content) {
    if (VERBOSE) console.log(`  ok    ${relPath}`);
    return;
  }
  if (CHECK) {
    drifts++;
    console.log(`  DRIFT ${relPath}`);
    return;
  }
  ensureDir(path.dirname(abs));
  fs.writeFileSync(abs, content);
  writes++;
  if (VERBOSE) console.log(`  write ${relPath}`);
}

// --- main --------------------------------------------------------------

const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8')
);

const expectedFiles = {
  '.claude/agents': new Set(),
  '.claude/commands': new Set(),
  '.opencode/agents': new Set(),
  '.opencode/commands': new Set(),
};

for (const [section, dirs] of Object.entries(TARGETS)) {
  const entries = manifest[section] || {};
  for (const [canonicalName, spec] of Object.entries(entries)) {
    const canonicalPath = path.join(ROOT, dirs.canonicalDir, `${canonicalName}.md`);
    if (!fs.existsSync(canonicalPath)) {
      console.error(`! missing canonical: ${dirs.canonicalDir}/${canonicalName}.md`);
      process.exitCode = 2;
      continue;
    }
    const body = stripFrontmatter(fs.readFileSync(canonicalPath, 'utf8'));

    // Claude (single variant per canonical, optional)
    if (spec.claude) {
      const filename = spec.claude.filename || `${canonicalName}.md`;
      const fm = spec.claude.frontmatter || {};
      const out = (Object.keys(fm).length ? emitFrontmatter(fm) : '') + body;
      const rel = path.join(dirs.claudeDir, filename);
      expectedFiles[dirs.claudeDir].add(filename);
      writeOrCheck(rel, out);
    }

    // OpenCode (array of variants, optional)
    if (Array.isArray(spec.opencode)) {
      for (const variant of spec.opencode) {
        const filename = variant.filename || `${canonicalName}.md`;
        const fm = variant.frontmatter || {};
        const out = (Object.keys(fm).length ? emitFrontmatter(fm) : '') + body;
        const rel = path.join(dirs.opencodeDir, filename);
        expectedFiles[dirs.opencodeDir].add(filename);
        writeOrCheck(rel, out);
      }
    }
  }
}

// Detect orphans (files in target dirs that the manifest does not produce)
const orphans = [];
for (const [dir, expected] of Object.entries(expectedFiles)) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs)) {
    if (!f.endsWith('.md')) continue;
    if (!expected.has(f)) orphans.push(path.join(dir, f));
  }
}

if (orphans.length) {
  console.log('\nOrphan files (present on disk, not in manifest):');
  for (const o of orphans) console.log(`  ! ${o}`);
}

if (CHECK) {
  if (PRUNE) {
    console.error('\nERROR: --prune cannot be combined with --check.');
    process.exit(2);
  }
  if (drifts > 0 || orphans.length > 0) {
    console.error(`\nCHECK FAILED: ${drifts} drift(s), ${orphans.length} orphan(s).`);
    process.exit(1);
  }
  console.log('CHECK OK: all generated files match manifest.');
} else {
  if (PRUNE && orphans.length) {
    for (const rel of orphans) {
      fs.unlinkSync(path.join(ROOT, rel));
      pruned++;
      if (VERBOSE) console.log(`  prune ${rel}`);
    }
  }
  console.log(`\nWrote ${writes} file(s).${PRUNE ? ` Pruned ${pruned} orphan(s).` : ''}`);
  if (orphans.length && !PRUNE) {
    console.log('Run with care: orphans were NOT removed automatically.');
    console.log('Delete them manually or re-run with `--prune`.');
  }
}
