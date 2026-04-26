# AI Quick Routes

Single source of truth for all agents and commands lives at the repo root:

- **Agents (canonical bodies):** `Agents/`
- **Commands (canonical bodies):** `Commands/`
- **Per-platform frontmatter (manifest):** `agent-build/manifest.json`
- **Build script:** `agent-build/build.mjs`
- **Workflow docs:** `agent-build/README.md`

The generated platform files in `.claude/` and `.opencode/` are produced by
`npm run build:agents`. **Never edit them by hand** — your changes will be
overwritten on the next build. Edit the canonical body in `Agents/` or
`Commands/` and re-run the build.

To verify generated files are in sync:

```bash
npm run build:agents:check
```
