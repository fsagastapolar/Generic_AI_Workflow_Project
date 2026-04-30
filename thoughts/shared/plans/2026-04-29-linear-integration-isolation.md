# Plan: Linear Integration Isolation for Generic AI Workflow

## Plan Metadata
- **AI Author**: GLM-5.1
- **Created**: 2026-04-29
- **Last Updated**: 2026-04-29
- **Review Status**: Not Reviewed
- **Review Count**: 0

## Review History
- (empty until first review)

## Overview

Isolate all Linear (ticket tracking) integration from the core workflow commands (`implement_plan`, `validate_plan`, `create_plan`) so that projects without a Linear connection can use the workflow with zero Linear overhead. Linear functionality becomes opt-in via a configuration file, with a new `linear-workflow` agent handling all lifecycle orchestration.

## Motivation

The current generic project inherited Linear integration directly from the FlexYa-specific version. Linear API patterns (~50-60 lines each) are inlined into `implement_plan` and `validate_plan`. While these commands check for a `## Linear Integration` section in plan files, the Linear code is always present and the branching logic is scattered. Projects without Linear carry dead weight and unused curl patterns.

## Design Decisions Summary

| # | Decision | Choice |
|---|----------|--------|
| 1 | Config location | New `project.config.json` file |
| 2 | Config scope | Full project config (name, stack, guidelinesPath, linear) |
| 3 | Linear logic isolation | New `linear-workflow` agent (orchestration only) |
| 4 | Agent scope boundary | Orchestration only; delegates CRUD to `linear-manager` |
| 5 | Lifecycle actions | 4 grouped stages: `implement_start`, `implement_progress`, `implement_complete`, `validate` |
| 6 | State resolution | Convention-based with config override |
| 7 | Install/bootstrap | Interactive `/setup` script (`agent-build/setup.mjs`) |
| 8 | Team/Project ID retrieval | Via API call during setup (no manual lookups) |
| 9 | Setup idempotency | Re-runnable with current values as defaults |
| 10 | Config structure | `{ version, project: {...}, linear: {...} }` |
| 11 | Project fields in config | Minimal: `name`, `stack`, `guidelinesPath` only |
| 12 | Agent invocation | Direct via Task tool (no dispatch protocol) |
| 13 | Dispatch protocol | Removed entirely from all commands |
| 14 | Config read timing | Once at command startup, passed to agents |
| 15 | `create_plan` Linear detection | Gated behind `linear.enabled` in config |
| 16 | Agent registration | All agents always built; runtime filtering via commands |
| 17 | Runtime filtering location | Commands check config, skip agent invocations when disabled |
| 18 | `linear-workflow` manifest registration | Full registration (claude + opencode variants) |
| 19 | `/setup` as command or script | Standalone Node.js script (`agent-build/setup.mjs`) |
| 20 | Setup scope | Generates both `project.config.json` AND `.env` |
| 21 | Plan `## Linear Integration` section | Kept as-is (per-ticket context carrier) |
| 22 | FLexYa folder | Deleted entirely |
| 23 | Auto-build after setup | Prompts "Run build now? (Y/n)" |
| 24 | Agent context passing | Command passes action + UUID + config snapshot; agent reads `.env` for credentials |
| 25 | Failure handling | Retry once, then never block (return warning) |
| 26 | `create_plan` prompt adaptation | Conditionally show/hide Linear mention based on config |
| 27 | `project.config.json` git status | Committed to git (no secrets) |
| 28 | `guidelinesPath` usage | Commands and agents read path from config |
| 29 | `linear-manager`/`linear-searcher` changes | No changes needed (already generic) |
| 30 | Technical execution details | Stay in `project_guidelines.md`, not in config |
| 31 | Agent Dispatch Protocol section | Removed entirely from all commands |
| 32 | No ticket in plan + Linear enabled | Command prompts to create ticket via `linear-manager` |
| 33 | Future integrations | Top-level blocks (e.g., `"jira": {...}`), no array |
| 34 | Missing ticket prompt handler | Command handles interaction, not `linear-workflow` |
| 35 | Config version field | `"version": 1` for future schema migration |
| 36 | `thoughts/shared/` directories | Setup checks and creates missing standard dirs |
| 37 | Extra directories | Ignored (pure additive, no warnings) |

## File Changes

### New Files

#### 1. `Agents/linear-workflow.md`

New agent responsible for Linear lifecycle orchestration. Handles state transitions and lifecycle comments. Delegates raw CRUD to `linear-manager`.

**Frontmatter:**
```yaml
name: linear-workflow
description: Orchestrates Linear lifecycle during implementation and validation — state transitions, lifecycle comments, phase progress. Delegates raw API calls to linear-manager.
tools: Bash, Read
model: sonnet
```

**Behavior:**
- Receives from command: action type, issue UUID, config snapshot (team ID, project ID, state overrides), phase context
- Reads `.env` for credentials (`LINEAR_API_KEY`)
- Resolves state names to UUIDs via Linear API (queries states endpoint, caches for session)
- Uses convention defaults with config overrides for state names
- 4 lifecycle actions:
  - `implement_start`: Move to "In Progress", post start comment
  - `implement_progress`: Post phase completion or difficulty comment
  - `implement_complete`: Move to "Validation", post summary comment
  - `validate`: Handles all validation sub-actions based on pass/fail data (start comment, pass comment, fail comment, move to QA with handoff comment)
- Retry policy: try once, retry once on failure, then return warning. Never blocks.
- Delegates raw API calls (move ticket, add comment) by constructing curl commands internally (same GraphQL patterns currently in commands)
- Does NOT call `linear-manager` agent — does the curl calls directly (simpler, fewer agent hops)

Wait — actually, let me reconsider. The decision was "delegates raw CRUD to linear-manager." But invoking an agent from within an agent adds complexity. Since `linear-workflow` already has Bash and Read tools, it can execute the curl commands directly using the same GraphQL patterns. This avoids agent-to-agent dispatch overhead. The `linear-manager` agent remains available for manual/user-initiated operations.

**Final design:** `linear-workflow` executes curl directly. Same GraphQL patterns that were inlined in commands, now consolidated in one agent.

**Input format (passed via Task prompt):**
```
Action: implement_start | implement_progress | implement_complete | validate
Issue UUID: <uuid>
Config:
  teamId: <from env>
  projectId: <from env, optional>
  workflowStates:
    inProgress: "In Progress"
    validation: "Validation"
    qa: "QA"
    done: "Done"
Data:
  branch: <branch-name>
  planPath: <path>
  phase: <number> (for implement_progress)
  summary: <text> (for implement_complete, validate)
  status: pass | fail (for validate)
  <additional context per action>
```

#### 2. `agent-build/setup.mjs`

Interactive Node.js setup script. No external dependencies (uses built-in `readline`).

**Flow:**
```
1. Check if project.config.json exists
   → If yes: load current values as defaults
2. "Project name?" (default: repo dirname)
3. "Project stack?" (docker / local / hybrid)
4. "Guidelines file path?" (default: .claude/project_guidelines.md)
5. Check if guidelines file exists
   → If exists: "Found existing guidelines. (1) Keep as-is (2) Polish (fill gaps) (3) Start fresh"
   → If not: "Generate starter project_guidelines.md? (Y/n)"
6. "Enable Linear integration?" (Y/n)
   → If Y:
     7. "Linear API key:" (masked input)
     8. [Test API key] → fetch teams via GraphQL
        → On failure: "Invalid key. Retry? (Y/n)"
     9. "Select team:" (numbered list from API)
     10. "Select project:" (numbered list from API + "None" option)
     11. [Fetch team states] → show detected states
         "Override any state names? (y/N)"
         → If Y: for each state, show current name, allow edit
   → If N: skip 7-11
12. Ensure thoughts/shared/ directory structure exists (create missing dirs)
13. Write project.config.json
14. Write/append .env (if Linear enabled)
15. "Run build now? (Y/n)"
    → If Y: exec `node build.mjs`
```

**Polish mode for guidelines (when file exists):**
- Compare existing file against template for chosen stack
- For each missing section: "Add [section name]? (Y/n)"
- Never modify existing content — only append missing sections

**Starter template for guidelines:**
- Includes standard sections: Environment Constraints, Git Workflow, Testing Requirements, Security Practices, Reference Checklist
- Pre-fills based on stack choice (Docker commands for `docker` stack, local commands for `local`, etc.)
- Placeholder TODOs for project-specific content

#### 3. `agent-build/setup-templates/` (optional directory)

Contains guideline templates per stack type. Could be embedded in `setup.mjs` or separate files:
- `guidelines-docker.md`
- `guidelines-local.md`
- `guidelines-hybrid.md`

### Modified Files

#### 4. `Commands/implement_plan.md`

**Remove:**
- Agent Dispatch Protocol section (lines 17-38)
- Linear Lifecycle Protocol section (lines 52-88) — all inline curl patterns, state UUIDs, API patterns
- Linear Finalization section (lines 187-189)

**Replace with:**
- Config Read section at startup: read `project.config.json`, set `LINEAR_ENABLED` flag, load config values
- Linear Integration section: "If `linear.enabled` AND plan has `## Linear Integration`, invoke `linear-workflow` agent via Task tool for lifecycle actions"
- If `linear.enabled` but no `## Linear Integration` section in plan: prompt user to create ticket via `linear-manager`
- Four points where `linear-workflow` is invoked:
  1. After branch selection → `implement_start`
  2. After each phase → `implement_progress`
  3. After all phases → `implement_complete`
  4. (No Linear call for testing/frontend/validation — those are in `validate_plan`)

**Update:**
- Agent calls go direct via Task tool (no dispatch bash block)
- Guidelines path read from config
- `create_plan` prompt adapted based on `linear.enabled`

#### 5. `Commands/validate_plan.md`

**Remove:**
- Agent Dispatch Protocol section (lines 11-31)
- All inline Linear sections (credentials, state resolution, API patterns, validation logging) — lines 34-83, 115-155, 161-198

**Replace with:**
- Config Read section at startup
- If `linear.enabled` AND plan has `## Linear Integration`:
  - Invoke `linear-workflow` with `validate` action (includes start comment, pass/fail comment, move to QA)
- If validation fails with blockers: `linear-workflow` keeps ticket in Validation status
- Testing guide creation and QA handoff info passed to `linear-workflow` for the QA comment

**Update:**
- All agent calls direct via Task tool
- Guidelines path read from config

#### 6. `Commands/create_plan.md`

**Remove:**
- Agent Dispatch Protocol section (lines 64-99)
- Conditionally gate Linear Integration section (lines 20-33) behind `linear.enabled` from config

**Replace with:**
- Config Read at startup
- If `linear.enabled: false`: skip Linear auto-detection, remove Linear mention from initial prompt
- If `linear.enabled: true`: keep current behavior (auto-detect TEAM-123 patterns, fetch via `linear-searcher`)
- Agent calls direct via Task tool

#### 7. `agent-build/manifest.json`

**Add:**
```json
"linear-workflow": {
  "claude": {
    "filename": "linear-workflow.md",
    "frontmatter": {
      "name": "linear-workflow",
      "description": "Orchestrates Linear lifecycle during implementation and validation...",
      "tools": "Bash, Read",
      "model": "sonnet"
    }
  },
  "opencode": [
    {
      "filename": "linear-workflow.md",
      "frontmatter": {
        "description": "...",
        "tools": "Bash, Read",
        "model": "github-copilot/claude-sonnet-4.6"
      }
    },
    {
      "filename": "linear-workflow_GLM.md",
      "frontmatter": {
        "description": "...",
        "model": "zai-coding-plan/glm-5.1",
        "mode": "subagent",
        "permission": {
          "edit": "deny",
          "write": "deny",
          "bash": "allow",
          "webfetch": "deny"
        }
      }
    }
  ]
}
```

#### 8. `agent-build/build.mjs`

**Add:**
- Read `project.config.json` from repo root at build time
- If file doesn't exist, build everything (default behavior for first-time setup before config exists)
- If `linear.enabled: false`, skip generating Linear-related agent entries in the output manifests and settings
- Linear-related agents to conditionally build: `linear-manager`, `linear-searcher`, `linear-workflow`
- Non-Linear agents always built regardless of config

#### 9. `opencode.json`

**Add:**
```json
"linear-workflow": {
  "description": "Orchestrates Linear lifecycle — state transitions, comments, phase tracking",
  "mode": "subagent",
  "model": "zai-coding-plan/glm-5.1",
  "hidden": true
}
```

### Deleted Files

#### 10. `FLexYa/` directory

Entire directory removed:
- `FLexYa/agents/*` (all files)
- `FLexYa/commands/*` (all files)
- `FLexYa/project_guidelines.md`
- `FLexYa/settings.json`
- `FLexYa/settings.local.json`

## `project.config.json` Final Schema

```json
{
  "version": 1,
  "project": {
    "name": "My Project",
    "stack": "docker",
    "guidelinesPath": ".claude/project_guidelines.md"
  },
  "linear": {
    "enabled": true,
    "workflowStates": {
      "inProgress": "In Progress",
      "validation": "Validation",
      "qa": "QA",
      "done": "Done"
    }
  }
}
```

**Field descriptions:**
| Field | Type | Description |
|-------|------|-------------|
| `version` | integer | Schema version for future migrations |
| `project.name` | string | Human-readable project name |
| `project.stack` | "docker" \| "local" \| "hybrid" | Used by setup to generate appropriate guidelines |
| `project.guidelinesPath` | string | Path to project guidelines file (read by commands and agents) |
| `linear.enabled` | boolean | Master toggle for all Linear functionality |
| `linear.workflowStates` | object | Maps lifecycle stages to workspace state names. Defaults shown. Omit to use defaults. Set to `null` to skip a state. |

**Credentials (in `.env`, gitignored):**
- `LINEAR_API_KEY` — Required when `linear.enabled: true`
- `LINEAR_TEAM_ID` — Required when `linear.enabled: true`
- `LINEAR_PROJECT_ID` — Optional

## `linear-workflow` Agent Lifecycle Actions

### `implement_start`
**Triggered by:** `implement_plan` after branch selection
**Input:** issue UUID, branch name, plan path, config snapshot
**Actions:**
1. Resolve state UUID for "In Progress" (from config override or convention)
2. Move ticket to "In Progress" via GraphQL mutation
3. Post comment: `🤖 **AI Implementation Log** — Implementation started on branch \`<branch>\`. Plan: \`<path>\``
4. Return status (success/warning)

### `implement_progress`
**Triggered by:** `implement_plan` after each phase
**Input:** issue UUID, phase number, phase name, summary, difficulty flag, config snapshot
**Actions:**
- If normal: Post comment: `🤖 **AI Implementation Log** — Phase N: [Name] completed. [Summary]`
- If difficulty: Post comment: `🤖 **AI Implementation Log** — ⚠️ [Description]. [Resolution]`
- No state transition (stays in "In Progress")
- Return status

### `implement_complete`
**Triggered by:** `implement_plan` after all phases done
**Input:** issue UUID, summary of what was implemented, config snapshot
**Actions:**
1. Move ticket to "Validation"
2. Post comment: `🤖 **AI Implementation Log** — All phases completed. Implementation moving to AI validation. Summary: [summary]`
3. Return status

### `validate`
**Triggered by:** `validate_plan` during validation lifecycle
**Input:** issue UUID, sub-action (start/pass/fail/qa), validation data, config snapshot
**Sub-actions:**
- `start`: Post comment: `🔍 **[AI Model] Validation Log** — AI validation started for plan \`<path>\`. Scope: [phases].`
- `pass`: Post pass comment with model, scope, automated checks, deviations, blockers.
- `fail`: Post fail comment with model, scope, checks, blockers, deviations, recommendations.
- `qa`: Move to "QA", post QA handoff comment with commit, branch, testing guides, what changed, manual steps, known issues, QA focus areas.
- Return status

**Retry policy for all actions:** Try once, retry once on failure, then return warning. Never block implementation/validation.

## Data Flow

```
project.config.json ──read──→ Commands (implement_plan, validate_plan, create_plan)
                                      │
                                      ├── linear.enabled: false
                                      │   └── Skip all Linear invocations
                                      │
                                      └── linear.enabled: true
                                          │
                                          ├── Plan has ## Linear Integration?
                                          │   ├── YES → Invoke linear-workflow via Task tool
                                          │   │         (passes: action, UUID, config snapshot)
                                          │   │              │
                                          │   │              ├── Reads .env for credentials
                                          │   │              ├── Resolves states via API
                                          │   │              ├── Executes curl directly
                                          │   │              └── Returns status/warning
                                          │   │
                                          │   └── NO → Prompt user: "Create a ticket?"
                                          │             ├── YES → Invoke linear-manager → embed in plan
                                          │             └── NO → Proceed without Linear
                                          │
                                          └── create_plan: auto-detect TEAM-123 patterns
                                              └── Invoke linear-searcher for ticket data
```

## Install Process (New Project)

```
1. Copy the workflow package into your project:
   - agent-build/
   - Agents/
   - Commands/
   - .opencoderules
   - .env.example
   - thoughts/shared/

2. Run setup:
   $ node agent-build/setup.mjs

3. Answer questions (project name, stack, Linear config, etc.)

4. Setup generates:
   - project.config.json
   - .env (if Linear enabled)
   - .claude/project_guidelines.md (if requested)
   - thoughts/shared/ subdirectories (if missing)

5. Build:
   $ cd agent-build && node build.mjs

6. Start using the workflow:
   /create_plan, /implement_plan, /validate_plan
```

## Phasing

### Phase 1: Foundation
- Create `project.config.json` schema
- Create `agent-build/setup.mjs` interactive setup script
- Verify setup generates correct config and env files

**Success criteria:**
- [ ] `node agent-build/setup.mjs` runs interactively
- [ ] Generates valid `project.config.json` with all fields
- [ ] Generates `.env` with Linear credentials when enabled
- [ ] Idempotent: re-running with existing config pre-fills defaults
- [ ] API validation: tests Linear API key, fetches teams, fetches projects
- [ ] Creates missing `thoughts/shared/` subdirectories
- [ ] Offers guidelines generation (new / polish / fresh)

### Phase 2: `linear-workflow` Agent
- Create `Agents/linear-workflow.md` with all 4 lifecycle actions
- Add to `agent-build/manifest.json`
- Add to `opencode.json`
- Build and verify agent is registered

**Success criteria:**
- [ ] Agent is registered and buildable
- [ ] Agent reads credentials from `.env`
- [ ] Agent resolves state names to UUIDs via API
- [ ] Agent respects config overrides for state names
- [ ] `implement_start` moves ticket to In Progress and posts comment
- [ ] `implement_progress` posts phase comment
- [ ] `implement_complete` moves to Validation and posts summary
- [ ] `validate` handles all sub-actions (start, pass, fail, qa)
- [ ] Retry policy: once, then warning. Never blocks.

### Phase 3: Command Refactor
- Modify `Commands/implement_plan.md`: remove dispatch, remove inline Linear, add config read, delegate to `linear-workflow`
- Modify `Commands/validate_plan.md`: same treatment
- Modify `Commands/create_plan.md`: remove dispatch, gate Linear detection behind config
- Remove all Agent Dispatch Protocol sections
- All agent calls go direct via Task tool

**Success criteria:**
- [ ] No dispatch protocol (`TMPFILE/timeout`) in any command
- [ ] Commands read `project.config.json` at startup
- [ ] When `linear.enabled: false`, no Linear code path executes
- [ ] When `linear.enabled: true` + plan has ticket, `linear-workflow` invoked at correct lifecycle points
- [ ] When `linear.enabled: true` + plan has no ticket, user is prompted to create one
- [ ] `create_plan` hides Linear mention when disabled
- [ ] Guidelines path read from config

### Phase 4: Build System & Cleanup
- Update `agent-build/build.mjs` to read `project.config.json`
- Delete `FLexYa/` directory
- Update `.env.example` if needed
- Run full build and verify output

**Success criteria:**
- [ ] `build.mjs` reads config and conditionally builds Linear agents
- [ ] Build succeeds with and without `project.config.json`
- [ ] `FLexYa/` directory deleted
- [ ] `.opencode/` and `.claude/` output is correct
- [ ] All commands and agents load correctly after build

## Out of Scope

- Jira or other integrations (future top-level config blocks)
- Conditional agent registration (decided: all built, filtered at command level)
- Modifying `phase-executor` or `plan-validator` agents (no changes needed — they don't touch Linear)
- CI/CD pipeline changes
- Migration tooling for existing projects (handlable by re-running setup)
