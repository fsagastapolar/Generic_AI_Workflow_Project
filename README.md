# Generic AI Workflow Project

This repository is a reusable template for organizing AI agents and slash commands in a way that can be adapted to many projects.

The goal is to keep agent and command logic generic, portable, and maintainable.

## What this project is for

- Store a generic agent/command system that can be reused in different codebases.
- Avoid project-specific assumptions in prompts (framework names, app-specific paths, one-off business context).
- Keep prompt bodies and platform frontmatter separate so updates are consistent and scalable.

## Core principles

1. Keep content generic
- Agent and command bodies should describe reusable workflows.
- Do not hardcode assumptions tied to a single project unless explicitly required by the target repository.

2. Separate logic from frontmatter
- Prompt logic lives in canonical markdown bodies.
- Platform metadata (model, permissions, mode, etc.) lives in a JSON manifest.
- A build script combines both and regenerates platform-specific files.

## Repository structure

- `Agents/` - canonical agent bodies.
- `Commands/` - canonical command bodies.
- `agent-build/manifest.json` - frontmatter source of truth.
- `agent-build/build.mjs` - generator that writes platform files.
- `.claude/` and `.opencode/` - generated outputs (do not hand-edit).
- `AI_routes.md` - quick routing map of key locations.

## How generation works

1. Edit canonical bodies in `Agents/` or `Commands/`.
2. Edit platform frontmatter in `agent-build/manifest.json` when needed.
3. Run build script to regenerate `.claude/` and `.opencode/` files.

If generated files are edited directly, those changes will be overwritten the next time you run the build.

## Common commands

Run from repository root:

- `npm run build:agents` - regenerate generated agent/command files.
- `npm run build:agents:check` - verify generated files are in sync.
- `npm run build:agents:verbose` - regenerate with detailed logs.
- `npm run build:agents:prune` - regenerate and remove orphan generated files.
- `npm run build:agents:gh` - generate OpenCode GH variants only.
- `npm run build:agents:glm` - generate OpenCode GLM variants only.
- `npm run agents:extract` - rebuild manifest from existing generated files (use with care).

## Recommended workflow

- Make changes only in canonical sources (`Agents/`, `Commands/`, `agent-build/manifest.json`).
- Regenerate with `npm run build:agents`.
- Validate with `npm run build:agents:check` before commit/PR.
- Commit both canonical changes and regenerated outputs.

## Portability checklist

Before merging changes, verify:

- Prompts are reusable and not tied to a single application.
- Paths and examples are generic unless intentionally template-scoped.
- Manifest entries are complete for all target platforms.
- Generated outputs are in sync with canonical sources.

## Related docs

- `AI_routes.md` - short navigation guide.
- `agent-build/README.md` - detailed build system documentation.
- `CLAUDE-SETUP.md` - local setup and security guidance.
