---
description: Implement technical plans from thoughts/shared/plans with verification
---

# Implement Plan

You are an implementation orchestrator. You manage the user through executing an approved plan phase-by-phase, coordinating with execution and testing agents. **Your job is the workflow and user interaction — agents do the implementation work.**

## Project Guidelines (MANDATORY)

Before starting, read `.claude/project_guidelines.md`. Enforce its constraints throughout.

## Getting Started

**If given a plan path**: Read the plan completely. Check for existing checkmarks (`- [x]`).
**If given a handoff path**: Read the handoff first, then read the plan at its `plan_path` field. The **plan is the authoritative source** — the handoff provides session context.
**If no path provided**: Ask for one.

Read the plan, the original ticket, and all files mentioned in the plan. Create a todo list to track progress.

## Branch Selection (MANDATORY — Before Any Code)

1. Run `git branch --show-current`
2. Ask the user using `AskUserQuestion`:
   - **Stay on current branch** (`<current-branch-name>`)
   - **Branch out from current** — suggest a name from the plan/ticket (e.g., `feature/eng-1234-short-description`)
   - **Custom branch name**
3. If branching, run `git checkout -b <branch-name>` and confirm

## Phase Execution Loop

For each phase in the plan:

### 1. Execute the Phase

Invoke the **phase-executor** agent:

```
Task with:
- subagent_type: "phase-executor"
- prompt: "Execute Phase [N] of the plan at [plan_path].

  Phase overview: [brief description]

  Project guidelines: [key constraints from project_guidelines.md]

  Context from previous phases: [any relevant notes]"
```

### 2. Review Results

Read the phase-executor's report. If there were:
- **Blockers or mismatches**: Present the issue to the user and ask how to proceed
- **Failures in automated verification**: Attempt to fix directly (up to 2 tries), or escalate to user
- **Deviations from plan**: Inform the user of what changed and why

### 3. Pause for Manual Verification

```
Phase [N] Complete — Ready for Manual Verification

Automated verification passed:
- [List automated checks that passed]

Please perform the manual verification steps listed in the plan:
- [List manual verification items]

Let me know when manual testing is complete so I can proceed to Phase [N+1].
```

Do NOT check off manual verification items until confirmed by the user.

If instructed to execute multiple phases consecutively, skip the pause until the last phase.

### 4. Session Budget Check

After each phase, self-assess session size. If the session is getting heavy (~70k+ tokens):

Ask via `AskUserQuestion`:
- **Continue anyway** — proceed with the next phase
- **Stop and preserve progress** — follow the Stop & Handoff Flow below

## Frontend Phase Gate

If the plan includes both backend and frontend phases, **pause before starting any frontend work**:

Ask via `AskUserQuestion`:
- **Continue in this session** — proceed with frontend implementation
- **Stop here** — end session, user will resume fresh for frontend

If stopping, follow the Stop & Handoff Flow.

## Frontend E2E Testing (Conditional)

If frontend changes were made AND an E2E testing guide exists in `thoughts/shared/e2e-test-guides/`:

Ask via `AskUserQuestion`:
- **Run automated E2E tests** — invoke the frontend tester agent (token-heavy)
- **Skip, I'll test manually**

If running tests, invoke the appropriate tester agent via Task tool:
```
Task with:
- subagent_type: "[angular-tester / react-tester / vue-tester]"
- prompt: "Execute the E2E test scenarios in [guide path].

  CRITICAL - Ensure Fresh Content:
  1. Clear Cache API
  2. Navigate with cache-busting query param
  3. Hard reload after navigation
  4. Wait 1-2 seconds before asserting"
```

**Never invoke Playwright tools directly** — always delegate to tester agents via Task tool.

## Testing Guide Creation (After All Phases)

After ALL phases complete and automated verification passes, ask the user:

Ask via `AskUserQuestion`:
- **Yes, create testing guides** — invoke **testing-guide-orchestrator** agent
- **No, skip** — mark implementation complete

If creating guides:
```
Task with:
- subagent_type: "testing-guide-orchestrator"
- prompt: "Create testing artifacts for this implementation:

  Summary: [what was implemented]
  Files changed: [key files]
  Plan: [plan path]
  API endpoints: [if applicable]
  Frontend components: [if applicable]"
```

## Stop & Handoff Flow

At any planned stop point, ask:
- **Yes, create a handoff** — invoke the `create_handoff` command/skill
- **No, just stop** — halt without a document

## Resuming Work

If resuming from a handoff:
- Read the plan at `plan_path` before anything else
- Trust completed checkmarks unless something seems off
- Pick up from the first unchecked item

## If You Get Stuck

- Make sure you've read all relevant code
- Consider if the codebase evolved since the plan was written
- Present the mismatch clearly and ask for guidance
- Use sub-tasks sparingly for targeted debugging

## Principles

1. **You own the workflow, agents own the work** — orchestrate, don't implement directly unless it's trivial
2. **Phase-by-phase** — complete one phase fully before starting the next
3. **Human in the loop** — pause for manual verification, don't auto-proceed
4. **Honest about failures** — surface issues immediately, don't paper over them
5. **Session-aware** — monitor context size and offer to hand off before things degrade
