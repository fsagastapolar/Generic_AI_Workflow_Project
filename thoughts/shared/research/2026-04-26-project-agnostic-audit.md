---
date: 2026-04-26
researcher: opencode (GLM-5.1)
topic: "Project-Agnostic Audit of Agents/ and Commands/"
status: complete
last_updated: 2026-04-26
type: audit
---

# Project-Agnostic Audit: Agents/ and Commands/

## Purpose

This repo is designed to be "project agnostic" — anything idiosyncratic to a specific project should NOT be hardcoded inside `Agents/` or `Commands/`. Those folders contain the logic body. Project-specific values should come from config files (e.g., `.claude/project_guidelines.md` or a `project_config.json`).

This audit identifies every violation of that principle.

## What's Already Working

`.claude/project_guidelines.md` is a template with placeholders like `[PROJECT_NAME]`, `[BACKEND_FRAMEWORK]`, etc. Some commands (like `create_plan.md`) already instruct agents to read it before proceeding. **That's the correct pattern.** The problem is inconsistency — many agents and commands hardcode values instead.

---

## CRITICAL Issues (Direct Tech-Stack Coupling)

### C-1. `Agents/codebase-pattern-finder.md` (lines 39-47) — Hardcoded Docker, MySQL, develop branch

```markdown
When finding patterns and examples for users to follow, be aware of `.claude/project_guidelines.md`:
- Suggest patterns that use Docker for backend operations
- Highlight examples using MySQL (never SQLite)
- Point out test patterns that follow the testing guardrails
- Note git workflow patterns that match the branching strategy (ussually branching from develop)
```

**Problem**: Hardcodes Docker, MySQL, and `develop` branch directly into the agent logic. A non-Docker, non-MySQL, non-develop project gets wrong recommendations.

**Fix**: Remove the hardcoded list. Replace with: *"Read `.claude/project_guidelines.md` and prefer patterns that align with the project's environment constraints, database requirements, and git workflow."*

---

### C-2. `Agents/reviewer.md` (lines 9-27) — Template placeholders baked into the agent body

```markdown
You are a specialized backend analysis agent for the [PROJECT_NAME] project...
- **Backend**: [BACKEND_FRAMEWORK] ([BACKEND_LANGUAGE]) running in Docker containers
- **Frontend**: [FRONTEND_FRAMEWORK] - not your focus
- **Database**: [DATABASE]
```

**Problem**: The agent has a comment saying "replace these" but the placeholders are IN the operational prompt. If someone imports this project and forgets to replace them, the agent hallucinates.

**Fix**: The agent should READ `.claude/project_guidelines.md` at startup and extract these values dynamically. Remove the hardcoded section entirely.

---

### C-3. `Agents/frontend-review.md` (entire file) — Entirely React-specific, no frontmatter

- References `React 18 vs 19`, `Tailwind v3 vs v4` (line 29)
- `dangerouslySetInnerHTML`, `useMemo`, `useCallback`, `Redux`, `Zustand` — all React-specific
- Reads `CLAUDE.md` (line 27) instead of `project_guidelines.md`
- No YAML frontmatter at all

**Problem**: This agent is useless for Angular, Vue, Svelte, or any non-React project. It also reads the wrong config file.

**Fix**: Either: (a) make it framework-agnostic by reading the frontend framework from project_guidelines.md, or (b) rename it to `react-frontend-review.md` and create parallel agents for other frameworks (consistent with the `react-tester` / `vue-tester` / `angular-tester` pattern).

---

### C-4. `Agents/e2e-test-guide-creator.md` (lines 183-243) — Docker-first assumption + framework-specific seeder paths

```markdown
### 4. Docker-First Approach
Since everything runs in Docker:
- **Backend commands**: Always use `docker exec {backend-container-name}`
```

And hardcoded seeder search paths:

```markdown
# Laravel
find . -path "*/database/seeders/*.php"
# Node/Prisma
find . -name "seed.ts" -o -name "seed.js"
# Rails
find . -path "*/db/seeds.rb"
```

**Problem**: Not all projects use Docker. The seeder paths are framework-specific guesses.

**Fix**: The Docker assumption should come from project_guidelines.md's "Environment Constraints" section. The seeder search should be dynamic — the agent has `Grep/Glob` tools and should search for common patterns rather than hardcoding framework paths.

---

### C-5. `Agents/plan-reviewer-codex.md` (lines 57-58) — Hardcoded TypeScript + Docker

```markdown
- For every TypeScript change: do the imports line up? Are types real? Does the proposed signature break callers?
- is it consistent with AGENTS.md (Docker mandatory — no host `npm`)?
```

**Problem**: TypeScript and Docker are assumed. Not all projects use TypeScript or Docker.

**Fix**: Replace with: *"For every code change, verify imports and type signatures are consistent with the actual codebase. Check that commands comply with the project's environment constraints from project_guidelines.md."*

---

### C-6. `Agents/plan-reviewer-gemini.md` (lines 58-59) — Hardcoded Zustand

```markdown
Cross-reference plan claims against AGENTS.md constraints (Docker mandatory, Zustand store, etc.)
```

**Problem**: "Zustand store" is a React-specific state management library.

**Fix**: Remove "Zustand store" from the hardcoded list. Replace with generic language about checking against project_guidelines.md constraints.

---

## MAJOR Issues (Inconsistent Config Usage)

### M-1. `Commands/debug.md` (lines 11-17) — Hardcodes project-specific values AND references project_guidelines.md

The command says "read project_guidelines.md" but then ALSO hardcodes:
- "Git Workflow: Branch from `develop`"
- "Docker Environment: Run all backend operations in Docker containers"
- "Backend: `docker exec -it {backend-container-name} <command>`"
- "Database: `docker exec -it {database-container-name} <command>`"

**Problem**: These hardcodes will contradict project_guidelines.md for non-Docker projects. The agent might follow the hardcoded instructions over the config.

**Fix**: Remove all the hardcoded values. The section should ONLY say "Read and follow `.claude/project_guidelines.md` for all environment, Docker, database, and git workflow details."

---

### M-2. `Commands/describe_pr_nt.md` (lines 37-53) — Hardcoded PR template

```markdown
## What problem(s) was I solving?
## What user-facing changes did I ship?
...
```

**Problem**: PR templates vary wildly between projects. Some use conventional commits, some use ticket-based formats, some have custom sections.

**Fix**: The template should come from `thoughts/shared/templates/pr_description.md` (which the command already mentions checking on line 55), but that path itself is hardcoded. Consider reading the template path from project_guidelines.md or a dedicated `project_config.json`.

---

### M-3. `Commands/implement_plan.md` & `Commands/validate_plan.md` — Hardcoded Linear workflow states

`implement_plan.md` line 189:
```markdown
Ticket flow: In Progress → Validation → QA → Done (manual)
```

`validate_plan.md` line 219:
```markdown
Ticket flow: **In Progress** → **Validation** → **QA** → **Done** (manual)
```

**Problem**: Different Linear teams have different state names. The agents DO resolve state UUIDs dynamically (which is good), but the hard-coded state names in the comments/prompts will confuse the agent on teams that don't have "Validation" or "QA" states.

**Fix**: Remove hardcoded state names from the prompt. The `linear-manager.md` already has a "Standard Workflow States" section — that's the right place for it. The commands should reference linear-manager's state discovery rather than hardcoding state names.

---

### M-4. `Agents/linear-manager.md` (lines 152-166) — Hardcoded standard workflow states

```markdown
| Backlog | Not yet prioritized |
| Todo | Prioritized, waiting to start |
| In Progress | Currently being implemented |
| Validation | AI validation in progress |
| QA | Ready for human QA testing |
| Done | Completed |
| Canceled | Canceled |
```

**Problem**: "Validation" and "QA" are not standard Linear states — they're specific to this project's workflow.

**Fix**: Move these to a `workflow_states` section in `project_config.json` or project_guidelines.md. The agent already resolves states dynamically via the API, but the reference table should come from config.

---

### M-5. `Agents/testing-guide-orchestrator.md` (lines 62-68) — Hardcoded frontend tester names

```markdown
The actual frontend tester agent (angular-tester, react-tester, vue-tester) should be invoked separately
```

**Problem**: When someone adds a new framework tester (e.g., `svelte-tester`), this agent doesn't know about it.

**Fix**: Add a `frontend_tester_agent` field to project config that specifies which tester to use. The orchestrator reads this and dispatches accordingly.

---

## MINOR Issues (Inconsistencies and Missing Coverage)

### m-1. Config file reference inconsistency across the entire codebase

Some files reference:
- `.claude/project_guidelines.md` — create_plan, debug, security_review, phase-executor, plan-validator
- `AGENTS.md` — review_plan_multi_agent, plan-reviewer-claude, plan-reviewer-codex, plan-reviewer-gemini, apply_review
- `CLAUDE.md` — frontend-review
- **No config reference at all** — plan-writer, plan-reviser, plan-review-consolidator, testing-guide-orchestrator

**Problem**: There's no single source of truth for project config. Three different file names are used across the codebase.

**Fix**: Pick ONE canonical config path and use it everywhere. Since `project_guidelines.md` already exists and is the most complete, standardize on that.

---

### m-2. `Agents/plan-writer.md` (line 142) — `make` preference

```markdown
Use `make` targets — For automated verification, prefer `make` commands when the project uses Makefiles.
```

**Problem**: Minor — not all projects use Make. Some use `npm run`, `cargo test`, `go test`, etc.

**Fix**: This should be configurable in project_guidelines.md under "verification commands" or "build system."

---

### m-3. `Commands/create_handoff.md` (line 19) — References non-existent script

```markdown
Run the `scripts/spec_metadata.sh` script to generate all relevant metadata
```

**Problem**: This script does not exist in the repo. Imported projects won't have it either.

**Fix**: Either include the script in this repo or remove the reference and have the agent generate metadata via bash commands directly.

---

## Config Gap Analysis

The following config keys need to exist somewhere but currently DON'T have a home:

| Config Key | Currently Hardcoded In | Proposed Config Location |
|---|---|---|
| `frontend_framework` | frontend-review.md, testing-guide-orchestrator.md | project_guidelines.md |
| `backend_framework` | reviewer.md, e2e-test-guide-creator.md | project_guidelines.md |
| `backend_language` | reviewer.md | project_guidelines.md |
| `database_type` | codebase-pattern-finder.md, e2e-test-guide-creator.md | project_guidelines.md |
| `use_docker` | debug.md, e2e-test-guide-creator.md, plan-reviewer-codex.md | project_guidelines.md |
| `docker_backend_container` | debug.md, e2e-test-guide-creator.md | project_guidelines.md |
| `docker_db_container` | debug.md, e2e-test-guide-creator.md | project_guidelines.md |
| `git_default_branch` | codebase-pattern-finder.md | project_guidelines.md |
| `build_tool` (make/npm/cargo/go) | plan-writer.md | project_guidelines.md |
| `pr_template_path` | describe_pr_nt.md | project_guidelines.md |
| `frontend_tester_agent` | testing-guide-orchestrator.md | project_config.json |
| `linear_workflow_states` | linear-manager.md, implement_plan.md, validate_plan.md | project_config.json or .env |
| `state_management_library` | plan-reviewer-gemini.md (Zustand) | project_guidelines.md |
| `config_file_path` (canonical) | Inconsistent across all files | Should be ONE path everywhere |

Note: project_guidelines.md already HAS fields for most of these (it has placeholders for backend, frontend, database, Docker services, etc.). The problem is that agents don't READ those fields — they hardcode their own assumptions instead.

---

## Recommended Fix Strategy

1. **Standardize on ONE config path**: `.claude/project_guidelines.md` already has the right structure. Add a machine-parseable section (YAML frontmatter or a JSON block) at the top with key-value pairs. The existing human-readable markdown stays below.

2. **Optionally create a `project_config.json`**: For values that are purely machine-consumed (like `frontend_tester_agent`, `linear_workflow_states`), a JSON file is cleaner. But it MUST be referenced consistently.

3. **Update CLAUDE-SETUP.md**: Add creating/filling the project config as a mandatory setup step when importing this project.

4. **Fix each flagged file**: Work through C-1 through C-6, then M-1 through M-5, then m-1 through m-3. Each fix replaces a hardcoded value with a config read.

5. **Add a build-time check**: The `agent-build/build.mjs` script could validate that `project_config.json` (or the config section of project_guidelines.md) has all required keys populated.

---

## File-by-File Checklist

### Commands (10 issues across 5 files)

- [ ] `Commands/debug.md` — Remove hardcoded Docker/develop/database references (M-1)
- [ ] `Commands/describe_pr_nt.md` — Make PR template path configurable (M-2)
- [ ] `Commands/implement_plan.md` — Remove hardcoded Linear workflow states (M-3)
- [ ] `Commands/validate_plan.md` — Remove hardcoded Linear workflow states (M-3)
- [ ] `Commands/create_handoff.md` — Fix or remove `scripts/spec_metadata.sh` reference (m-3)

### Agents (11 issues across 9 files)

- [ ] `Agents/codebase-pattern-finder.md` — Remove hardcoded Docker/MySQL/develop (C-1)
- [ ] `Agents/reviewer.md` — Replace template placeholders with config read (C-2)
- [ ] `Agents/frontend-review.md` — Make framework-agnostic or rename to React-specific (C-3)
- [ ] `Agents/e2e-test-guide-creator.md` — Remove Docker-first assumption and hardcoded seeder paths (C-4)
- [ ] `Agents/plan-reviewer-codex.md` — Remove TypeScript/Docker hardcodes (C-5)
- [ ] `Agents/plan-reviewer-gemini.md` — Remove Zustand/Docker hardcodes (C-6)
- [ ] `Agents/linear-manager.md` — Move workflow states to config (M-4)
- [ ] `Agents/testing-guide-orchestrator.md` — Make frontend tester agent configurable (M-5)
- [ ] `Agents/plan-writer.md` — Make build tool configurable (m-2)

### Cross-cutting (1 issue, affects all files)

- [ ] Standardize config file reference to ONE canonical path (m-1)

---

## Annex: Recommended Solution — Build-Time Interpolation

### Overview

The recommended fix for all issues identified in this audit is **build-time template interpolation**. The project already has a build step (`agent-build/build.mjs`) that copies source files from `Agents/`/`Commands/` to `.claude/`/`.opencode/`. That build step is the perfect place to resolve project-specific placeholders.

### Why This Approach

Three approaches were evaluated:

| Approach | Pros | Cons |
|---|---|---|
| **Build-time interpolation** | Zero runtime token cost; source files stay agnostic; build step already exists | Config changes require rebuild (already required per `.opencoderules`) |
| **Runtime config read** | No build complexity; immediate effect | Burns tokens every invocation; agent might misinterpret; doesn't work for behavioral values (e.g., which tester agent to dispatch) |
| **Hybrid** | Best of both worlds | More complex |

**Chosen: Hybrid, biased heavily toward build-time interpolation.**

### Placeholder Syntax

**`{{FLAT_KEY_NAME}}`** — Mustache-style double curly braces.

Why not JSONPath (`{config.backend.framework}`):
- LLMs read raw markdown — they'd see the literal path string and not resolve it
- `{{KEY}}` is instantly human-readable when editing source files
- Decouples the placeholder from the storage schema — reorganizing config doesn't break placeholders
- Simple `String.replace()` in the build script

### The Config File

**`project_config.json`** at repo root. Created from `project_config.json.example` during project setup.

```json
{
  "PROJECT_NAME": "MedTracker",
  "BACKEND_FRAMEWORK": "Laravel",
  "BACKEND_LANGUAGE": "PHP",
  "FRONTEND_FRAMEWORK": "Angular",
  "DATABASE_TYPE": "MySQL",
  "USE_DOCKER": true,
  "DOCKER_BACKEND_CONTAINER": "medtracker-backend",
  "DOCKER_DB_CONTAINER": "medtracker-db",
  "DOCKER_DB_CLI_COMMAND": "mysql",
  "DOCKER_DB_NAME": "medtracker",
  "GIT_DEFAULT_BRANCH": "develop",
  "BUILD_TOOL": "make",
  "FRONTEND_TESTER_AGENT": "angular-tester",
  "STATE_MANAGEMENT_LIBRARY": null,
  "PR_TEMPLATE_PATH": "thoughts/shared/templates/pr_description.md",
  "CONFIG_FILE_PATH": ".claude/project_guidelines.md",
  "ENVIRONMENT_DESCRIPTION": "Docker containers via docker-compose",
  "SEEDER_SEARCH_PATTERNS": "database/seeders/*.php",
  "BACKEND_API_PORT": 8000,
  "FRONTEND_PORT": 4200
}
```

Keys are flat (not nested) to keep the `String.replace()` logic trivial and the placeholders readable.

### How It Works

#### Before (current state)

`Agents/reviewer.md` contains:
```markdown
You are a specialized backend analysis agent for the [PROJECT_NAME] project.
- **Backend**: [BACKEND_FRAMEWORK] ([BACKEND_LANGUAGE])
```

The `[PLACEHOLDER]` format was never resolved — it shipped as-is to `.claude/`.

#### After (with interpolation)

`Agents/reviewer.md` source contains:
```markdown
You are a specialized backend analysis agent for the {{PROJECT_NAME}} project.
- **Backend**: {{BACKEND_FRAMEWORK}} ({{BACKEND_LANGUAGE}})
```

`build.mjs` reads `project_config.json`, finds all `{{KEY}}` patterns, replaces them, and writes the resolved version to `.claude/agents/reviewer.md`:
```markdown
You are a specialized backend analysis agent for the MedTracker project.
- **Backend**: Laravel (PHP)
```

### Hybrid Strategy: When to Use Each Approach

| Value | Approach | Rationale |
|---|---|---|
| `PROJECT_NAME` | Build-time | Shapes the entire prompt context |
| `BACKEND_FRAMEWORK` | Build-time | Determines review approach, seeder paths, command style |
| `FRONTEND_FRAMEWORK` | Build-time | Determines which tester agent to dispatch |
| `USE_DOCKER` | Build-time | Changes the operational protocol (docker exec vs direct) |
| `DOCKER_BACKEND_CONTAINER` | Build-time | Injected into command templates |
| `DOCKER_DB_CONTAINER` | Build-time | Injected into command templates |
| `GIT_DEFAULT_BRANCH` | Build-time | Hardcoded in multiple commands |
| `DATABASE_TYPE` | Build-time | Affects query patterns, seeder discovery, review focus |
| `BUILD_TOOL` | Build-time | Determines verification command format |
| `FRONTEND_TESTER_AGENT` | Build-time | Controls which sub-agent the orchestrator dispatches |
| `SEEDER_SEARCH_PATTERNS` | Build-time | Framework-specific glob patterns |
| `BACKEND_API_PORT` | Build-time | Used in curl command generation |
| `FRONTEND_PORT` | Build-time | Used in test guide URLs |
| Linear workflow states | **Runtime** | Already dynamically resolved via Linear API |
| Full project guidelines | **Runtime** | Rich markdown with context — too complex for interpolation; agents should still read `.claude/project_guidelines.md` for nuanced guidelines that don't fit into flat keys |

### Build Script Changes

`agent-build/build.mjs` needs these additions:

1. Read `project_config.json` from repo root at the start of the build
2. For each source file being copied to `.claude/` or `.opencode/`, scan for `{{KEY}}` patterns
3. Replace each `{{KEY}}` with the corresponding value from the config
4. If a `{{KEY}}` has no matching config entry, either warn or fail the build (configurable)
5. Skip interpolation for files in `Unused/` or files that don't contain `{{`

Pseudo-implementation:

```javascript
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('project_config.json', 'utf-8'));

function interpolate(content) {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (config[key] === undefined) {
      console.warn(`Warning: {{${key}}} not found in project_config.json`);
      return match;
    }
    return String(config[key]);
  });
}
```

### Setup Flow Changes

`CLAUDE-SETUP.md` needs a new step:

```markdown
### 1.5. Configure Project Settings

Copy the project configuration template and fill in your project details:

bash
cp project_config.json.example project_config.json


Edit project_config.json with your project's specific values:
- Project name and tech stack
- Docker container names (if using Docker)
- Default git branch
- Build tool (make, npm, cargo, etc.)
- Frontend tester agent (angular-tester, react-tester, or vue-tester)

After modifying project_config.json, rebuild the agent files:

bash
cd agent-build && node build.mjs
```

### Gitignore Changes

Add to `.gitignore`:
```
project_config.json
```

Keep `project_config.json.example` tracked (like `.env.example`).

### Per-Issue Fix Mapping

Each issue from the main report maps to specific `{{KEY}}` replacements:

| Issue ID | File | Hardcoded Value | Becomes |
|---|---|---|---|
| C-1 | `Agents/codebase-pattern-finder.md` | "Docker for backend", "MySQL (never SQLite)", "develop" | `{{USE_DOCKER}}`, `{{DATABASE_TYPE}}`, `{{GIT_DEFAULT_BRANCH}}` — or remove entirely and read project_guidelines.md at runtime |
| C-2 | `Agents/reviewer.md` | `[PROJECT_NAME]`, `[BACKEND_FRAMEWORK]`, etc. | `{{PROJECT_NAME}}`, `{{BACKEND_FRAMEWORK}}`, `{{BACKEND_LANGUAGE}}`, `{{FRONTEND_FRAMEWORK}}`, `{{DATABASE_TYPE}}` |
| C-3 | `Agents/frontend-review.md` | React 18/19, Tailwind, Redux, Zustand | `{{FRONTEND_FRAMEWORK}}` — then conditional logic based on framework, or split into framework-specific agents |
| C-4 | `Agents/e2e-test-guide-creator.md` | Docker-first, hardcoded seeder paths | `{{USE_DOCKER}}`, `{{DOCKER_BACKEND_CONTAINER}}`, `{{DOCKER_DB_CONTAINER}}`, `{{SEEDER_SEARCH_PATTERNS}}` |
| C-5 | `Agents/plan-reviewer-codex.md` | "TypeScript", "Docker mandatory" | Remove TypeScript assumption; `{{USE_DOCKER}}` for Docker check |
| C-6 | `Agents/plan-reviewer-gemini.md` | "Zustand store" | Remove or replace with `{{STATE_MANAGEMENT_LIBRARY}}` |
| M-1 | `Commands/debug.md` | Docker commands, develop branch | `{{USE_DOCKER}}`, `{{DOCKER_BACKEND_CONTAINER}}`, `{{DOCKER_DB_CONTAINER}}`, `{{GIT_DEFAULT_BRANCH}}` |
| M-2 | `Commands/describe_pr_nt.md` | Hardcoded PR template | `{{PR_TEMPLATE_PATH}}` |
| M-3 | `Commands/implement_plan.md` | "In Progress → Validation → QA → Done" | Keep — these are dynamically resolved via Linear API |
| M-4 | `Agents/linear-manager.md` | Hardcoded workflow state table | Keep as reference — the agent already resolves states dynamically |
| M-5 | `Agents/testing-guide-orchestrator.md` | "angular-tester, react-tester, vue-tester" | `{{FRONTEND_TESTER_AGENT}}` |
| m-1 | Cross-cutting | Inconsistent config file references | Standardize on `{{CONFIG_FILE_PATH}}` (defaults to `.claude/project_guidelines.md`) |
| m-2 | `Agents/plan-writer.md` | "make targets" | `{{BUILD_TOOL}}` |
| m-3 | `Commands/create_handoff.md` | `scripts/spec_metadata.sh` | Remove reference; agent generates metadata via bash directly |

### What NOT to Interpolate

Some things should remain as runtime reads from `project_guidelines.md`:

- **Rich guidelines** (security practices, code organization, testing requirements) — too complex and too long for flat keys
- **Linear workflow states** — already dynamically discovered via API
- **Anything that changes frequently** — project guidelines can be edited without a rebuild
- **Compliance requirements** (HIPAA, GDPR) — these belong in the human-readable guidelines

The rule of thumb: **if it's a single value that affects agent behavior or command generation, interpolate it at build time. If it's a nuanced guideline or rich text, read it at runtime from project_guidelines.md.**

### Implementation Order

1. Create `project_config.json.example` with all required keys
2. Add interpolation logic to `agent-build/build.mjs`
3. Update `.gitignore` to exclude `project_config.json`
4. Update `CLAUDE-SETUP.md` with the new setup step
5. Work through the per-issue fix mapping (C-1 through m-3), replacing hardcodes with `{{KEY}}` placeholders in source files
6. Test the full build with a sample `project_config.json`
7. Verify the built output in `.claude/` and `.opencode/` has correct resolved values
