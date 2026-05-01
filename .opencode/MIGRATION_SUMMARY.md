# OpenCode Migration Summary: Claude → GLM

## Overview

This document summarizes the migration of all agent and command configurations from `.claude/` (Claude Code format) to `.opencode/` (OpenCode format), configured to use GLM (`zai-coding-plan/glm-5.1`) instead of Claude.

---

## Directory Structure Created

```
.opencode/
├── agents/          # 17 agent markdown files
└── commands/        # 9 command markdown files
opencode.json        # Global configuration file
```

---

## Agents (17 total)

All agents use `model: zai-coding-plan/glm-5.1` and `mode: subagent`.

| # | Agent File | Description | Hidden | Permission Highlights |
|---|-----------|-------------|--------|-----------------------|
| 1 | `angular-tester.md` | QA automation for Angular apps via agent-browser | Yes | edit: deny, write: deny |
| 2 | `codebase-analyzer.md` | Analyzes implementation details with file:line refs | No | edit: deny, write: deny, bash: deny |
| 3 | `codebase-locator.md` | Locates files/directories by feature/topic | No | edit: deny, write: deny, bash: deny |
| 4 | `codebase-pattern-finder.md` | Finds similar implementations and code patterns | No | edit: deny, write: deny, bash: deny |
| 5 | `e2e-test-guide-creator.md` | Creates API E2E test guides with curl/SQL/docker commands | No | edit: deny, bash: allow |
| 6 | `frontend-review.md` | Frontend review + WCAG 2.1 AA compliance | No | edit: deny, write: deny, bash: allow, webfetch: allow |
| 7 | `phase-executor.md` | Executes a single phase from an implementation plan | Yes | edit: allow, write: allow, bash: allow |
| 8 | `plan-validator.md` | Audits implementation against its plan | No | edit: deny, write: deny, bash: allow |
| 9 | `plan-writer.md` | Writes implementation plan documents from structured input | Yes | edit: allow, write: allow, bash: deny |
| 10 | `react-tester.md` | QA automation for React apps via agent-browser | Yes | edit: deny, write: deny, bash: allow |
| 11 | `research-gatherer.md` | Orchestrates parallel research via sub-agents | No | edit: deny, write: deny, bash: deny |
| 12 | `reviewer.md` | Backend analysis and comprehensive review | No | edit: deny, write: allow, bash: allow, webfetch: allow |
| 13 | `testing-guide-orchestrator.md` | Decides which test guides to create and delegates | Yes | edit: allow, write: allow, bash: deny |
| 14 | `thoughts-analyzer.md` | Extracts high-value insights from thoughts/ docs | No | edit: deny, write: deny, bash: deny |
| 15 | `thoughts-locator.md` | Discovers docs in thoughts/ directory | No | edit: deny, write: deny, bash: deny |
| 16 | `vue-tester.md` | QA automation for Vue.js apps via agent-browser | Yes | edit: deny, write: deny, bash: allow |
| 17 | `web-search-researcher.md` | Web research for external/modern information | No | edit: deny, write: deny, webfetch: allow |

---

## Commands (9 total)

| # | Command File | Slash Command | Description | Agent | Subtask |
|---|-------------|---------------|-------------|-------|---------|
| 1 | `create_handoff.md` | `/create_handoff` | Create handoff document for transferring work to another session | build | true |
| 2 | `create_plan.md` | `/create_plan` | Create detailed implementation plans through interactive research | build | true |
| 3 | `debug.md` | `/debug` | Debug issues by investigating logs, database, and git history | build | true |
| 4 | `describe_pr_nt.md` | `/describe_pr_nt` | Generate comprehensive PR descriptions | build | true |
| 5 | `generate_prompt_from_input.md` | `/generate_prompt_from_input` | Transform user input into optimized structured prompt | build | false |
| 6 | `implement_plan.md` | `/implement_plan` | Implement technical plans with phase-by-phase verification | build | true |
| 7 | `research_codebase_nt.md` | `/research_codebase_nt` | Document codebase as-is without evaluation | build | true |
| 8 | `resume_handoff.md` | `/resume_handoff` | Resume work from a handoff document | build | true |
| 9 | `validate_plan.md` | `/validate_plan` | Validate implementation against plan | build | true |

---

## Key Adaptations from Claude to OpenCode

### Model
| Aspect | Claude (.claude/) | OpenCode (.opencode/) |
|--------|-------------------|-----------------------|
| Model ID | `sonnet`, `opus` | `zai-coding-plan/glm-5.1` |
| Config location | YAML frontmatter `model:` | YAML frontmatter `model:` |

### Tool System
| Claude Format | OpenCode Format | Notes |
|---------------|-----------------|-------|
| `tools: Read, Grep, Glob, LS` | `permission: { edit: deny, write: deny, bash: deny }` | OpenCode uses permission-based system instead of explicit tool allowlists |
| `disallowedTools: edit_file` | `permission: { edit: deny }` | "deny" replaces disallowedTools |
| `tools: Write, Edit` | `permission: { edit: allow, write: allow }` | "allow" enables write tools |
| `tools: browser_*` | `agent-browser` CLI via Bash | Browser testing uses agent-browser CLI, not MCP |
| `tools: WebSearch, WebFetch` | `permission: { webfetch: allow }` | Merged into webfetch permission |
| `tools: Task` | Always available | Task tool for sub-agent invocation is always available |
| `tools: TodoWrite` | `todowrite` tool | Always available |
| `tools: AskUserQuestion` | `question` tool | Always available |

### Agent Configuration
| Claude Format | OpenCode Format |
|---------------|-----------------|
| `name: agent-name` | Filename becomes the agent name (e.g., `review.md` → `review`) |
| N/A | `mode: subagent` (explicit mode required) |
| N/A | `hidden: true` (hides from @ autocomplete) |
| `color: yellow` | `color: "#FFC107"` (hex color in OpenCode) |

### Path References
| Claude Reference | OpenCode Reference |
|-------------------|-------------------|
| `.claude/project_guidelines.md` | `AGENTS.md` |
| `.claude/agents/` | `.opencode/agents/` |
| `.claude/commands/` | `.opencode/commands/` |

### Frontmatter Differences
| Claude Agent Frontmatter | OpenCode Agent Frontmatter |
|--------------------------|---------------------------|
| `name:` | (filename = agent name) |
| `description:` | `description:` |
| `model: sonnet` | `model: zai-coding-plan/glm-5.1` |
| `tools: Read, Grep, Glob` | `permission: { edit: deny, write: deny, bash: deny }` |
| `disallowedTools: edit_file` | (handled via permission deny) |
| N/A | `mode: subagent` |
| N/A | `hidden: true` |

### Command Differences
| Claude Command Frontmatter | OpenCode Command Frontmatter |
|----------------------------|------------------------------|
| `description:` | `description:` |
| `model: opus` | `model: zai-coding-plan/glm-5.1` |
| N/A | `agent: build` |
| N/A | `subtask: true` |

---

## Global Config: opencode.json

Located at project root. Contains:

- All 17 agents registered with their model, mode, description, and hidden status
- Build and Plan primary agents set to use `zai-coding-plan/glm-5.1`

---

## What Was NOT Migrated

These files from `.claude/` were intentionally not migrated as they are Claude-specific infrastructure:

| File | Reason |
|------|--------|
| `.claude/mcp_config.json` | MCP config format differs; OpenCode uses its own MCP config |
| `.claude/mcp_config_merged.json` | Claude-specific merged config |
| `.claude/mcp_playwright.json` | Legacy Playwright MCP config (removed) |
| `.claude/settings.json` | Claude-specific settings (theme, permissions) |
| `.claude/settings.local.json` | Claude-specific local settings |

**Note**: Browser testing is handled via `agent-browser` CLI (invoked by tester agents through Bash). No MCP server configuration is needed for browser automation. See [OpenCode MCP docs](https://opencode.ai/docs/mcp-servers/) for other MCP servers.

---

## Validation Checklist

Use this checklist to verify the migration:

### File Existence
- [ ] `.opencode/agents/` contains 17 `.md` files
- [ ] `.opencode/commands/` contains 9 `.md` files
- [ ] `opencode.json` exists at project root

### Agent Validation (per agent file)
- [ ] YAML frontmatter is valid
- [ ] `model: zai-coding-plan/glm-5.1` is set
- [ ] `mode: subagent` is set
- [ ] `permission` block exists with appropriate access
- [ ] Agent prompt content is intact (compare with `.claude/agents/` counterparts)
- [ ] No references to `.claude/` remain in the prompt body
- [ ] `.claude/project_guidelines.md` references changed to `AGENTS.md`

### Command Validation (per command file)
- [ ] YAML frontmatter is valid
- [ ] `agent: build` is set (where applicable)
- [ ] `subtask: true` is set (where applicable)
- [ ] Command prompt content is intact
- [ ] No references to Claude-specific tools (AskUserQuestion, Skill, etc.)
- [ ] Tool references updated: `Task` tool syntax matches OpenCode format

### Config Validation
- [ ] `opencode.json` is valid JSON
- [ ] All 17 agents listed with correct model
- [ ] Build and Plan primary agents configured
- [ ] Hidden agents correctly flagged

### Functional Validation
- [ ] `opencode` command runs without errors in the project
- [ ] Tab key cycles between Build and Plan agents
- [ ] Custom commands appear with `/` prefix in TUI
- [ ] Sub-agents invokable via `@` mention (non-hidden ones)
- [ ] `AGENTS.md` exists and contains project guidelines

---

## Mapping: Claude Agent → OpenCode Agent

| Claude Agent File | OpenCode Agent File | Key Changes |
|-------------------|---------------------|-------------|
| `.claude/agents/angular-tester.md` | `.opencode/agents/angular-tester.md` | model, permission, mode |
| `.claude/agents/codebase-analyzer.md` | `.opencode/agents/codebase-analyzer.md` | model, permission, mode |
| `.claude/agents/codebase-locator.md` | `.opencode/agents/codebase-locator.md` | model, permission, mode |
| `.claude/agents/codebase-pattern-finder.md` | `.opencode/agents/codebase-pattern-finder.md` | model, permission, mode |
| `.claude/agents/e2e-test-guide-creator.md` | `.opencode/agents/e2e-test-guide-creator.md` | model, permission, mode |
| `.claude/agents/frontend-review.md` | `.opencode/agents/frontend-review.md` | model, permission, mode |
| `.claude/agents/phase-executor.md` | `.opencode/agents/phase-executor.md` | model, permission, mode, hidden |
| `.claude/agents/plan-validator.md` | `.opencode/agents/plan-validator.md` | model, permission, mode |
| `.claude/agents/plan-writer.md` | `.opencode/agents/plan-writer.md` | model, permission, mode, hidden |
| `.claude/agents/react-tester.md` | `.opencode/agents/react-tester.md` | model, permission, mode, hidden |
| `.claude/agents/research-gatherer.md` | `.opencode/agents/research-gatherer.md` | model, permission, mode |
| `.claude/agents/reviewer.md` | `.opencode/agents/reviewer.md` | model, permission, mode |
| `.claude/agents/testing-guide-orchestrator.md` | `.opencode/agents/testing-guide-orchestrator.md` | model, permission, mode, hidden |
| `.claude/agents/thoughts-analyzer.md` | `.opencode/agents/thoughts-analyzer.md` | model, permission, mode |
| `.claude/agents/thoughts-locator.md` | `.opencode/agents/thoughts-locator.md` | model, permission, mode |
| `.claude/agents/vue-tester.md` | `.opencode/agents/vue-tester.md` | model, permission, mode, hidden |
| `.claude/agents/web-search-researcher.md` | `.opencode/agents/web-search-researcher.md` | model, permission, mode, color |

## Mapping: Claude Command → OpenCode Command

| Claude Command File | OpenCode Command File | Key Changes |
|---------------------|-----------------------|-------------|
| `.claude/commands/create_handoff.md` | `.opencode/commands/create_handoff.md` | agent, subtask added |
| `.claude/commands/create_plan.md` | `.opencode/commands/create_plan.md` | model changed, agent/subtask added |
| `.claude/commands/debug.md` | `.opencode/commands/debug.md` | agent, subtask added |
| `.claude/commands/describe_pr_nt.md` | `.opencode/commands/describe_pr_nt.md` | agent, subtask added |
| `.claude/commands/generate_prompt_from_input.md` | `.opencode/commands/generate_prompt_from_input.md` | agent added |
| `.claude/commands/implement_plan.md` | `.opencode/commands/implement_plan.md` | model changed, agent/subtask added |
| `.claude/commands/research_codebase_nt.md` | `.opencode/commands/research_codebase_nt.md` | model changed, agent/subtask added |
| `.claude/commands/resume_handoff.md` | `.opencode/commands/resume_handoff.md` | agent, subtask added |
| `.claude/commands/validate_plan.md` | `.opencode/commands/validate_plan.md` | agent, subtask added |
