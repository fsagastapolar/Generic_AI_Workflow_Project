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
| `npm run agents:extract` | One-shot: re-read every existing `.claude/`/`.opencode/` file and rebuild `manifest.json` from their current frontmatter. Useful after a major reorg, **destructive** to manual manifest edits. |

## Path resolution

The script resolves all paths relative to its own parent directory (the repo
root). No absolute paths are baked in, so the system works on any machine
and in any clone of the project.

## Orphans

If you delete an agent from the manifest but its generated file still exists
on disk, the script will report it as an orphan but **will not** delete it
automatically. Remove orphan files manually.

## CI hint

Add this to a pre-commit hook or CI step to ensure the generated files are
always in sync with the canonical sources:

```bash
npm run build:agents:check
```
