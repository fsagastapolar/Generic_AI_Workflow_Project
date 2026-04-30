#!/usr/bin/env node
/**
 * Build script: regenerate .claude/{agents,commands}/,
 * .opencode/{agents,commands}/ and .opencode/skills/ from canonical
 * bodies in Agents/, Commands/ and Skills/ combined with per-platform
 * frontmatter from manifest.json.
 *
 * Usage:
 *   node agent-build/build.mjs            # write files
 *   node agent-build/build.mjs --check    # exit 1 if any output would change
 *   node agent-build/build.mjs --verbose  # log every file written
 *   node agent-build/build.mjs --prune    # also delete orphan files (not in manifest)
 *   node agent-build/build.mjs --opencode=gh|glm|both
 *                                         # filter OpenCode variants by provider
 *                                         # (default: both). Classification is by
 *                                         # filename: *_GLM.md = GLM, else GH.
 *                                         # Claude output is unaffected.
 *                                         # Combine with --prune to delete the
 *                                         # deselected variant files from disk.
 *                                         # With --check, validates only the
 *                                         # selected subset.
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

// --opencode=gh|glm|both  (default: both)
const opencodeArg = process.argv.slice(2).find(a => a.startsWith('--opencode='));
const OPENCODE_FILTER = (opencodeArg ? opencodeArg.split('=')[1] : 'both').toLowerCase();
if (!['gh', 'glm', 'both'].includes(OPENCODE_FILTER)) {
  console.error(`ERROR: --opencode must be one of: gh, glm, both. Got: "${OPENCODE_FILTER}"`);
  process.exit(2);
}

// Classify a variant as 'glm' or 'gh' based on filename convention.
function variantProvider(filename) {
  return /_GLM\.md$/i.test(filename) ? 'glm' : 'gh';
}

// Returns true if a variant should be emitted given the active filter.
function variantSelected(filename) {
  if (OPENCODE_FILTER === 'both') return true;
  return variantProvider(filename) === OPENCODE_FILTER;
}

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
  skills: {
    canonicalDir: 'Skills',
    opencodeDir: '.opencode/skills',
    type: 'skill',
  },
};

const LEGACY_OPENCODE_COLOR_MAP = {
  yellow: '#FFC107',
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

function cloneObject(value) {
  if (Array.isArray(value)) return value.map(cloneObject);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cloneObject(v)]));
  }
  return value;
}

function splitLegacyToolList(value) {
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function derivePermissionFromLegacyTools(toolsValue, disallowedToolsValue, existingPermission) {
  const tools = new Set(splitLegacyToolList(toolsValue).map(item => item.toLowerCase()));
  const disallowedTools = new Set(
    splitLegacyToolList(disallowedToolsValue).map(item => item.toLowerCase())
  );
  const permission = cloneObject(existingPermission || {});

  if (permission.edit === undefined) {
    permission.edit = tools.has('edit') && !disallowedTools.has('edit_file') ? 'allow' : 'deny';
  }
  if (permission.write === undefined) {
    permission.write = tools.has('write') ? 'allow' : 'deny';
  }
  if (permission.bash === undefined) {
    permission.bash = tools.has('bash') ? 'allow' : 'deny';
  }
  if (permission.webfetch === undefined) {
    permission.webfetch = tools.has('webfetch') || tools.has('websearch') ? 'allow' : 'deny';
  }

  return permission;
}

function normalizeOpencodeAgentFrontmatter(frontmatter) {
  const fm = cloneObject(frontmatter || {});
  const hasLegacyToolConfig = typeof fm.tools === 'string' || typeof fm.disallowedTools === 'string';

  if (typeof fm.color === 'string') {
    const mappedColor = LEGACY_OPENCODE_COLOR_MAP[fm.color.toLowerCase()];
    if (mappedColor) fm.color = mappedColor;
  }

  if (fm.mode === undefined) {
    fm.mode = 'subagent';
  }

  if (hasLegacyToolConfig) {
    fm.permission = derivePermissionFromLegacyTools(fm.tools, fm.disallowedTools, fm.permission);
    delete fm.tools;
    delete fm.disallowedTools;
  }

  return fm;
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

const projectConfigPath = path.join(ROOT, 'project.config.json');
let linearEnabled = true;
if (fs.existsSync(projectConfigPath)) {
  try {
    const projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
    linearEnabled = projectConfig.linear?.enabled !== false;
  } catch {
    linearEnabled = true;
  }
}

const LINEAR_AGENTS = new Set(['linear-manager', 'linear-searcher', 'linear-workflow']);

const expectedFiles = {
  '.claude/agents': new Set(),
  '.claude/commands': new Set(),
  '.opencode/agents': new Set(),
  '.opencode/commands': new Set(),
};

const expectedSkillDirs = new Set();

function warningHeader(canonicalDir) {
  return `> [!WARNING]
> **DO NOT EDIT THIS FILE DIRECTLY.**
> This file is auto-generated by the build system.
> To modify this, please edit the source file at \`${canonicalDir}/\` and the configuration in \`agent-build/manifest.json\`, then re-run the build script.

`;
}

for (const [section, dirs] of Object.entries(TARGETS)) {
  const entries = manifest[section] || {};
  const isSkill = dirs.type === 'skill';

  for (const [canonicalName, spec] of Object.entries(entries)) {
    if (section === 'agents' && LINEAR_AGENTS.has(canonicalName) && !linearEnabled) {
      if (VERBOSE) console.log(`  skip  ${canonicalName} (Linear disabled in project.config.json)`);
      continue;
    }

    if (isSkill) {
      const canonicalPath = path.join(ROOT, dirs.canonicalDir, canonicalName, 'SKILL.md');
      if (!fs.existsSync(canonicalPath)) {
        console.error(`! missing canonical: ${dirs.canonicalDir}/${canonicalName}/SKILL.md`);
        process.exitCode = 2;
        continue;
      }
      const body = stripFrontmatter(fs.readFileSync(canonicalPath, 'utf8'));
      const dirname = spec.opencode.dirname || canonicalName;
      const fm = spec.opencode.frontmatter || {};
      const out = (Object.keys(fm).length ? emitFrontmatter(fm) : '') + warningHeader(dirs.canonicalDir) + body;
      const rel = path.join(dirs.opencodeDir, dirname, 'SKILL.md');
      expectedSkillDirs.add(dirname);
      writeOrCheck(rel, out);
      continue;
    }

    const canonicalPath = path.join(ROOT, dirs.canonicalDir, `${canonicalName}.md`);
    if (!fs.existsSync(canonicalPath)) {
      console.error(`! missing canonical: ${dirs.canonicalDir}/${canonicalName}.md`);
      process.exitCode = 2;
      continue;
    }
    const body = stripFrontmatter(fs.readFileSync(canonicalPath, 'utf8'));

    const hdr = warningHeader(dirs.canonicalDir);

    // Claude (single variant per canonical, optional)
    if (spec.claude) {
      const filename = spec.claude.filename || `${canonicalName}.md`;
      const fm = spec.claude.frontmatter || {};
      const out = (Object.keys(fm).length ? emitFrontmatter(fm) : '') + hdr + body;
      const rel = path.join(dirs.claudeDir, filename);
      expectedFiles[dirs.claudeDir].add(filename);
      writeOrCheck(rel, out);
    }

    // OpenCode (array of variants, optional)
    if (Array.isArray(spec.opencode)) {
      for (const variant of spec.opencode) {
        const filename = variant.filename || `${canonicalName}.md`;
        if (!variantSelected(filename)) continue;
        const fm = section === 'agents'
          ? normalizeOpencodeAgentFrontmatter(variant.frontmatter)
          : (variant.frontmatter || {});
        const out = (Object.keys(fm).length ? emitFrontmatter(fm) : '') + hdr + body;
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

// Detect orphan skill directories
const skillOrphansDir = '.opencode/skills';
const skillOrphans = [];
const skillsAbs = path.join(ROOT, skillOrphansDir);
if (fs.existsSync(skillsAbs)) {
  for (const entry of fs.readdirSync(skillsAbs)) {
    const entryAbs = path.join(skillsAbs, entry);
    if (!fs.statSync(entryAbs).isDirectory()) continue;
    if (!expectedSkillDirs.has(entry)) skillOrphans.push(path.join(skillOrphansDir, entry));
  }
}

if (orphans.length) {
  console.log('\nOrphan files (present on disk, not in manifest):');
  for (const o of orphans) console.log(`  ! ${o}`);
}

if (skillOrphans.length) {
  console.log('\nOrphan skill directories (present on disk, not in manifest):');
  for (const o of skillOrphans) console.log(`  ! ${o}`);
}

const allOrphans = orphans.length + skillOrphans.length;

if (CHECK) {
  if (PRUNE) {
    console.error('\nERROR: --prune cannot be combined with --check.');
    process.exit(2);
  }
  const filterMsg = OPENCODE_FILTER === 'both' ? '' : ` (opencode filter: ${OPENCODE_FILTER})`;
  if (drifts > 0 || allOrphans > 0) {
    console.error(`\nCHECK FAILED${filterMsg}: ${drifts} drift(s), ${allOrphans} orphan(s).`);
    process.exit(1);
  }
  console.log(`CHECK OK${filterMsg}: all generated files match manifest.`);
} else {
  if (PRUNE && orphans.length) {
    for (const rel of orphans) {
      fs.unlinkSync(path.join(ROOT, rel));
      pruned++;
      if (VERBOSE) console.log(`  prune ${rel}`);
    }
  }
  if (PRUNE && skillOrphans.length) {
    for (const rel of skillOrphans) {
      fs.rmSync(path.join(ROOT, rel), { recursive: true, force: true });
      pruned++;
      if (VERBOSE) console.log(`  prune ${rel}`);
    }
  }
  const filterMsg = OPENCODE_FILTER === 'both' ? '' : ` [opencode filter: ${OPENCODE_FILTER}]`;
  console.log(`\nWrote ${writes} file(s)${filterMsg}.${PRUNE ? ` Pruned ${pruned} orphan(s).` : ''}`);
  if (allOrphans && !PRUNE) {
    console.log('Run with care: orphans were NOT removed automatically.');
    console.log('Delete them manually or re-run with `--prune`.');
  }
}
