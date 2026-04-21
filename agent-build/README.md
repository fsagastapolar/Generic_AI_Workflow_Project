# Agent & Command Build System

Single source of truth for every AI agent and slash command used by both
**Claude Code** (`.claude/`) and **OpenCode** (`.opencode/`).

## Why

Previously every agent/command lived in two (or more) places:

- `.claude/agents/foo.md` for Claude Code
- `.opencode/agents/foo_GLM.md`, `foo_GH.md`, ... for OpenCode

A change to the agent body had to be made in every copy. This refactor
centralizes the **bodies** (the system prompt) into `Agents/` and `Commands/`
at the repo root, and keeps the **per-platform frontmatter** in
`agent-build/manifest.json`. A small Node script regenerates the
`.claude/**` and `.opencode/**` files on demand.

```
Agents/<name>.md         ←  canonical body (no frontmatter, or stripped)
Commands/<name>.md       ←  canonical body
agent-build/manifest.json ← per-platform frontmatter (model, tools, permissions, ...)
agent-build/build.mjs    ← combines them and writes .claude/** and .opencode/**
```

## Daily workflow

### Edit an existing agent body
1. Edit `Agents/<name>.md` (or `Commands/<name>.md`).
2. Run `npm run build:agents`.
3. Commit the canonical file **and** the regenerated `.claude/`/`.opencode/` files.

### Change frontmatter for one platform (model, tools, permissions, etc.)
1. Edit `agent-build/manifest.json` for that agent's `claude` or
   `opencode` entry.
2. Run `npm run build:agents`.
3. Commit.

For OpenCode agents, prefer native frontmatter fields like `mode`, `permission`,
`hidden`, and hex `color` values. The build script still normalizes legacy
OpenCode `tools` / `disallowedTools` agent entries so older manifest data does
not regenerate invalid markdown.

### Add a brand-new agent
1. Create `Agents/<new-name>.md` with the body (no frontmatter needed).
2. Add an entry to `agent-build/manifest.json` under `agents`:
   ```json
   "<new-name>": {
     "claude": {
       "filename": "<new-name>.md",
       "frontmatter": {
         "name": "<new-name>",
         "description": "...",
         "tools": "Read, Grep, Glob",
         "model": "sonnet"
       }
     },
     "opencode": [
       {
         "filename": "<new-name>_GLM.md",
         "frontmatter": {
           "description": "...",
           "model": "zai-coding-plan/glm-5.1",
           "mode": "subagent",
           "permission": { "edit": "deny", "write": "deny", "bash": "deny", "webfetch": "deny" }
         }
       }
     ]
   }
   ```
3. Run `npm run build:agents`.

To target only one platform, omit the other key.
To add multiple OpenCode variants (e.g. a `_GLM` and a `_GH` flavour), add
multiple objects to the `opencode` array.

### Add a brand-new command
Identical to adding an agent, but use `Commands/` and the `commands` key
in the manifest.

## Scripts

| Command | What it does |
|---|---|
| `npm run build:agents` | Regenerate `.claude/` and `.opencode/` files from canonical bodies + manifest. |
| `npm run build:agents:check` | Dry-run. Exit code 1 if any file would change or any orphan exists. Use in CI / pre-commit. |
| `npm run build:agents:verbose` | Like `build:agents`, but logs every file written/skipped. |
| `npm run build:agents:prune` | Like `build:agents`, but also deletes orphan `.md` files (present on disk, not in the manifest). |
| `npm run build:agents:gh` | Build OpenCode files for the GH (GitHub Copilot) provider only. Claude output is unaffected. |
| `npm run build:agents:glm` | Build OpenCode files for the GLM (z.ai) provider only. Claude output is unaffected. |
| `npm run agents:extract` | One-shot: re-read every existing `.claude/`/`.opencode/` file and rebuild `manifest.json` from their current frontmatter. Useful after a major reorg, **destructive** to manual manifest edits. |

### Raw flags

The build script accepts these flags directly (`node agent-build/build.mjs <flags>`):

| Flag | Effect |
|---|---|
| `--check` | Dry-run; exit 1 on any drift or orphan. |
| `--verbose` | Log every file written / skipped / pruned. |
| `--prune` | Delete orphan files from `.claude/**` and `.opencode/**`. Cannot combine with `--check`. |
| `--opencode=gh\|glm\|both` | Filter which OpenCode variants get emitted. Default `both`. Classification is by filename: `*_GLM.md` → GLM, anything else → GH. Claude output is **never** filtered. |

Flags compose. Useful combinations:

```bash
# Validate only the GH subset (GLM files on disk become orphans → CHECK fails).
node agent-build/build.mjs --check --opencode=gh

# Switch the working tree to GH-only mode and clean up the GLM files.
node agent-build/build.mjs --opencode=gh --prune

# Restore both providers.
npm run build:agents
```

## Provider filtering (GH vs GLM)

This repo runs on **two OpenCode aliases**: one defaults to GitHub Copilot
models (`github-copilot/...`), the other to z.ai's GLM (`zai-coding-plan/...`).
Most agents and commands therefore have two OpenCode variants:

- `<name>.md` — the GH variant
- `<name>_GLM.md` — the GLM variant

If you only ever use one of the two aliases, you can keep your working tree
lean by building only that subset:

```bash
npm run build:agents:gh    # writes only .opencode/**/<name>.md
npm run build:agents:glm   # writes only .opencode/**/<name>_GLM.md
```

The other variants will appear as orphans on the next run; `--prune` deletes
them. **Claude (`.claude/**`) is untouched** by this filter — Claude has
exactly one variant per item, so there is nothing to filter.

A few items intentionally exist for **only one** provider and are not
affected by the filter:

- The multi-agent reviewer trio (`plan-reviewer-claude`, `plan-reviewer-codex`,
  `plan-reviewer-gemini`, `plan-review-consolidator`) and the
  `review_plan_multi_agent` command are **GH-only** by design — they require
  multiple model providers, which the GLM alias cannot supply.

## Path resolution

The script resolves all paths relative to its own parent directory (the repo
root). No absolute paths are baked in, so the system works on any machine
and in any clone of the project.

## Orphans

An **orphan** is a `.md` file present in `.claude/**` or `.opencode/**` that
the current manifest (and active filter, if any) does not produce.

- `npm run build:agents` — reports orphans, leaves them on disk.
- `npm run build:agents:check` — fails if any orphans exist.
- `npm run build:agents:prune` — reports and **deletes** them.

Note: the `--opencode=gh|glm` filter narrows what counts as "produced", so
filtered-out variants become orphans and are subject to the rules above.

## Legacy OpenCode Frontmatter

Some historical OpenCode agent variants in this repo were authored with
Claude-style fields such as `tools: "Read, Grep, Glob"`,
`disallowedTools: "edit_file"`, or named colors like `yellow`.

`agent-build/build.mjs` now normalizes those legacy OpenCode agent frontmatter
values during generation:

- adds `mode: subagent` if it is missing
- converts legacy tool lists into an OpenCode `permission` object
- drops `disallowedTools` after folding it into permissions
- converts named colors like `yellow` to OpenCode-friendly hex values

This keeps rebuilds safe while the manifest is migrated incrementally.

## CI hint

Add this to a pre-commit hook or CI step to ensure the generated files are
always in sync with the canonical sources:

```bash
npm run build:agents:check
```
