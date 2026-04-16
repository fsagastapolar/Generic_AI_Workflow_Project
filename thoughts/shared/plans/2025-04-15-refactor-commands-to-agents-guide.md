# Refactoring Commands → Thin Orchestrators + Agents

## The Problem

`create_plan`, `implement_plan`, and `validate_plan` commands are monolithic 300-500 line files that mix three concerns:
1. **User interaction** (asking questions, presenting options, pausing for confirmation)
2. **Cognitive work** (researching codebase, writing plans, executing phases, validating results)
3. **Lifecycle management** (session budgets, handoffs, phase gates)

The agents are clean and focused, but the commands are bloated orchestrators doing everything.

## The Principle

**Commands own the conversation. Agents own the work.**

A command should read like a screenplay — "gather input, delegate research, ask the user X, delegate writing." The *how* of each step lives in an agent.

## New Agents to Create

Create these 5 new files in `.claude/agents/`:

### 1. `research-gatherer.md`
**Extracted from**: `create_plan`'s research/context-gathering steps  
**Purpose**: Takes a task description and orchestrates parallel sub-agents (codebase-locator, codebase-analyzer, thoughts-locator, etc.) to produce a structured **research brief** with file:line references  
**Key details**:
- Input: task description, ticket contents, user context
- Spawns 2-3+ sub-agents in parallel (locator, analyzer, pattern-finder, thoughts-locator)
- Reads critical files itself after sub-agents return (don't rely solely on summaries)
- Output: structured research brief with sections for source files, current implementation analysis, patterns to follow, prior research, integration points, constraints, and open questions
- Strictly a researcher — does NOT suggest solutions or critique code

### 2. `plan-writer.md`
**Extracted from**: `create_plan`'s template and plan-writing logic  
**Purpose**: Takes finalized inputs (research brief, user decisions, scope, phasing) and writes the plan document. Does NOT interact with the user — receives resolved decisions only.  
**Key details**:
- Input: research brief, user decisions from Q&A, scope (in/out), agreed phasing, project guidelines summary, target file path
- Output: complete plan document using your project's standard template
- Includes file naming convention (`YYYY-MM-DD-ENG-XXXX-description.md`)
- Separates success criteria into automated (runnable commands) and manual (human judgment)
- Includes E2E testing guide steps where applicable
- If something is unresolved, puts it in an `## Open Questions` section rather than guessing
- Uses `make` targets for automated verification when project uses Makefiles

### 3. `phase-executor.md`
**Extracted from**: `implement_plan`'s per-phase implementation logic  
**Purpose**: Executes a single phase — makes code changes, runs automated verification, reports results. Does NOT interact with the user.  
**Key details**:
- Input: plan path, phase number, project guidelines, context from previous phases
- Reads the FULL plan (needs context from all phases, not just its own)
- Reads ALL target files completely before modifying
- For mismatches: minor adaptations are OK (note them), fundamental mismatches → STOP and report
- Runs every automated verification command from the phase's success criteria
- Retries failures up to 2 times before reporting
- Updates plan checkboxes for completed items (NOT manual verification items)
- Output: structured execution report with status, changes made, verification results, deviations, blockers

### 4. `plan-validator.md`
**Extracted from**: `validate_plan`'s systematic verification process  
**Purpose**: Audits implementation against plan — compares actual changes to planned changes, runs verification commands, checks project guidelines compliance. Does NOT fix issues.  
**Key details**:
- Input: plan path, scope (which phases), project guidelines path
- Gathers evidence via `git log` and `git diff`
- For each phase: checks file changes, runs automated verification, assesses manual criteria, checks project guidelines compliance
- Thinks about edge cases (error handling, missing validations, regressions)
- Output: structured validation report with implementation status, verification results, code review findings, guidelines compliance, manual testing needed, recommendations

### 5. `testing-guide-orchestrator.md`
**Extracted from**: `implement_plan`'s test guide creation logic and decision matrix  
**Purpose**: Classifies the implementation type and delegates test guide creation to the right specialist agents.  
**Key details**:
- Input: implementation summary, files changed, plan reference
- Classifies implementation as: backend API / frontend / full-stack / database-infra
- Decision matrix:
  - Backend → invoke `e2e-test-guide-creator` agent
  - Frontend → create guide for tester agent (angular/react/vue-tester)
  - Full-stack → both
  - Database/infra → manual test guide only
- Delegates to specialist agents — does NOT write test guides manually
- Output: report of what was created, where, and what wasn't needed

## Rewriting the Commands

### `create_plan.md` (~150 lines, down from ~500)

Restructure as a 6-step conversation script:

1. **Gather Input** — read provided files or prompt for task description
2. **Research** — invoke `research-gatherer` agent (and `thoughts-locator` in parallel). Read critical files the agents identify.
3. **Interactive Q&A** — present findings, ask clarifying questions ONE at a time. Format: `[Technical/Business Logic] QN of Total`, 4+ options, recommendation with reasoning. Technical questions first, then business logic.
4. **Structure Approval** — one question about phasing
5. **Write the Plan** — invoke `plan-writer` agent with all gathered context (research brief, decisions, scope, phasing, project guidelines)
6. **Review & Iterate** — present the draft, iterate on feedback

Keep the project guidelines mandate at the top. Keep the principles at the bottom: be skeptical, be interactive, one question at a time, delegate the work, no open questions in final plan.

**Delete**: all inline research orchestration logic, the plan template, the sub-task spawning best practices section, the common patterns section, the success criteria guidelines section — these all live in agents now.

### `implement_plan.md` (~160 lines, down from ~350)

Restructure as a phase loop with gates:

1. **Getting Started** — read plan (or handoff → plan), create todo list
2. **Branch Selection** — `git branch --show-current`, ask user to stay/branch/custom
3. **Phase Execution Loop** — for each phase:
   - Invoke `phase-executor` agent
   - Review results (handle blockers, failures, deviations)
   - Pause for manual verification (don't auto-check-off manual items)
   - Session budget check (~70k tokens → offer to stop)
4. **Frontend Phase Gate** — if mixed backend+frontend, pause before frontend work
5. **Frontend E2E Testing** — conditional, ask user, delegate to tester agent via Task tool
6. **Testing Guide Creation** — after all phases, ask user, invoke `testing-guide-orchestrator`
7. **Stop & Handoff Flow** — at any stop point, offer to create handoff

**Delete**: all inline implementation philosophy, the entire testing guide decision matrix and creation logic, the detailed frontend tester invocation instructions, the session token budget explanation — these live in agents now.

### `validate_plan.md` (~80 lines, down from ~180)

Restructure as: locate plan → delegate → present:

1. **Locate the plan** — from parameter, recent commits, or ask user
2. **Validate** — invoke `plan-validator` agent with plan path, scope, and guidelines
3. **Present Results** — show the report, highlight blockers, list manual testing, suggest next steps
4. **Handle Issues** — offer to fix fixable issues or skip

**Delete**: the entire systematic validation process, the inline validation report template, the validation checklist — all in the agent now.

## Adaptation Notes for Your Project

- **Replace placeholder project-specific details** in each agent: Docker container names, `make` targets, database type, framework-specific paths
- **Replace `[angular-tester / react-tester / vue-tester]`** with your project's actual frontend tester agent name throughout `implement_plan` and `testing-guide-orchestrator`
- **Keep your project guidelines reference** (`project_guidelines.md`) — the commands and agents both reference it, so it's the single source of truth for constraints
- **Keep your existing specialist agents** (codebase-locator, codebase-analyzer, etc.) — the new agents delegate TO them, they don't replace them
- **The `create_handoff` command stays as-is** — it's already appropriately scoped as a skill

## Expected Results

| File | Before | After | Reduction |
|------|--------|-------|-----------|
| `create_plan.md` | ~500 lines | ~150 lines | ~70% |
| `implement_plan.md` | ~350 lines | ~160 lines | ~55% |
| `validate_plan.md` | ~180 lines | ~80 lines | ~55% |
| New agents | 0 | ~545 lines total | — |
| **Net** | **~1030 lines** | **~935 lines** | — |

The net line count is similar, but the **distribution** is completely different. The reusable cognitive work is in agents (composable, testable in isolation, invocable from anywhere), and the commands are thin scripts that a human can read in 2 minutes and understand the full workflow.
