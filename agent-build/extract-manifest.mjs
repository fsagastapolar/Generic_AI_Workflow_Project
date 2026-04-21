#!/usr/bin/env node
/**
 * One-shot bootstrap: scans .claude/ and .opencode/ folders and emits
 * agent-build/manifest.json describing every platform variant of every
 * agent and command. Run ONCE to seed the manifest, then hand-edit going
 * forward (or re-run after a major reorg if you trust your current state).
 *
 * Usage: node agent-build/extract-manifest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const LEGACY_OPENCODE_COLOR_MAP = {
  yellow: '#FFC107',
};

// --- minimal YAML frontmatter parser (enough for our files) ---
// Supports: scalar strings, scalar numbers/booleans, and one-level nested mappings
// (e.g. `permission:\n  edit: deny`). No arrays needed.
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { frontmatter: {}, body: text };
  const fmText = m[1];
  const body = text.slice(m[0].length);
  const lines = fmText.split(/\r?\n/);
  const fm = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }
    const km = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!km) { i++; continue; }
    const key = km[1];
    let val = km[2];
    if (val === '') {
      // possible nested map (1 or 2 levels deep)
      const [nested, consumed] = parseNestedMap(lines, i + 1, 2);
      fm[key] = nested;
      i = consumed;
      continue;
    }
    fm[key] = coerce(val);
    i++;
  }
  return { frontmatter: fm, body };
}

function coerce(v) {
  v = v.trim();
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

// Parse a nested mapping starting at line index `start`, where children are
// indented deeper than `parentIndent` spaces. Returns [object, nextLineIndex].
// Supports up to `maxDepth` levels of nesting.
function parseNestedMap(lines, start, maxDepth, parentIndent = 0) {
  const result = {};
  let i = start;
  // Determine this level's indent from first non-empty line
  let levelIndent = null;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) { i++; continue; }
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch[1].length;
    if (indent <= parentIndent) break;
    if (levelIndent === null) levelIndent = indent;
    if (indent < levelIndent) break;
    if (indent > levelIndent) { i++; continue; } // safety
    // parse "key: value" — key may be quoted
    const km = line.slice(indent).match(/^("(?:[^"\\]|\\.)*"|'[^']*'|[A-Za-z_*][\w*-]*)\s*:\s*(.*)$/);
    if (!km) { i++; continue; }
    let key = km[1];
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1);
    }
    const val = km[2];
    if (val === '' && maxDepth > 1) {
      const [nested, consumed] = parseNestedMap(lines, i + 1, maxDepth - 1, indent);
      result[key] = nested;
      i = consumed;
    } else {
      result[key] = coerce(val);
      i++;
    }
  }
  return [result, i];
}

function listMd(dir) {
  const p = path.join(ROOT, dir);
  if (!fs.existsSync(p)) return [];
  return fs.readdirSync(p).filter(f => f.endsWith('.md'));
}

// Map a platform variant filename to its canonical name.
// Strip a trailing _GLM, _GH, _XYZ tag (one underscore + uppercase tag).
function canonicalName(filename) {
  const base = filename.replace(/\.md$/, '');
  return base.replace(/_[A-Z][A-Z0-9]+$/, '');
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

function buildSection(claudeDir, opencodeDir, canonicalDir) {
  const out = {};
  const canonicalSet = new Set(listMd(canonicalDir).map(f => f.replace(/\.md$/, '')));

  // Seed every canonical
  for (const c of canonicalSet) out[c] = { claude: null, opencode: [] };

  // Claude variants
  for (const f of listMd(claudeDir)) {
    const name = canonicalName(f);
    if (!out[name]) out[name] = { claude: null, opencode: [] };
    const text = fs.readFileSync(path.join(ROOT, claudeDir, f), 'utf8');
    const { frontmatter } = parseFrontmatter(text);
    out[name].claude = {
      filename: f,
      frontmatter,
    };
  }

  // OpenCode variants
  for (const f of listMd(opencodeDir)) {
    const name = canonicalName(f);
    if (!out[name]) out[name] = { claude: null, opencode: [] };
    const text = fs.readFileSync(path.join(ROOT, opencodeDir, f), 'utf8');
    const { frontmatter } = parseFrontmatter(text);
    const normalizedFrontmatter = opencodeDir.endsWith('/agents')
      ? normalizeOpencodeAgentFrontmatter(frontmatter)
      : frontmatter;
    out[name].opencode.push({
      filename: f,
      frontmatter: normalizedFrontmatter,
    });
  }

  // Drop nulls for clean JSON
  for (const k of Object.keys(out)) {
    if (out[k].claude === null) delete out[k].claude;
    if (out[k].opencode.length === 0) delete out[k].opencode;
  }
  return out;
}

const manifest = {
  agents: buildSection('.claude/agents', '.opencode/agents', 'Agents'),
  commands: buildSection('.claude/commands', '.opencode/commands', 'Commands'),
};

const outPath = path.join(__dirname, 'manifest.json');
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Wrote ${outPath}`);
console.log(`  agents:   ${Object.keys(manifest.agents).length} canonical entries`);
console.log(`  commands: ${Object.keys(manifest.commands).length} canonical entries`);
