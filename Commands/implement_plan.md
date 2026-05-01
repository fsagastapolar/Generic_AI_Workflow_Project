---
description: Implement technical plans from thoughts/shared/plans with verification
---

# Implement Plan

You are tasked with implementing an approved technical plan from `thoughts/shared/plans/`. You orchestrate the work by delegating each phase to the `phase-executor` agent and handling user interaction yourself.

**Commands own the conversation. Agents own the work.**

## Code Quality
- Prefer correct, complete implementations over minimal ones.
- Use appropriate data structures and algorithms — don't brute-force what has a known better solution.
- When fixing a bug, fix the root cause, not the symptom.
- If something I asked for requires error handling or validation to work reliably, include it without asking.

---

## Config Read (At Startup)

1. Read `project.config.json` from the repository root
2. Set `LINEAR_ENABLED = config.linear?.enabled === true`
3. Set `GUIDELINES_PATH = config.project?.guidelinesPath || '.claude/project_guidelines.md'`
4. If the config file does not exist, proceed with defaults: `LINEAR_ENABLED = false`, `GUIDELINES_PATH = '.claude/project_guidelines.md'`

---

## Getting Started

When given a plan path:
- Read the plan completely and check for any existing checkmarks (- [x])
- Read the original ticket and all files mentioned in the plan
- **Read files fully** - never use limit/offset parameters
- **Check for `## Linear Integration` section** — if present, extract the Issue UUID
- Create a todo list to track your progress
- If no plan path provided, ask for one

## Linear Integration

If `LINEAR_ENABLED` is true:

1. **If the plan contains a `## Linear Integration` section with an Issue UUID**:
   - After branch selection → invoke `linear-workflow` agent via Task tool with action `implement_start`
   - After each phase → invoke `linear-workflow` with action `implement_progress`
   - After all phases complete → invoke `linear-workflow` with action `implement_complete`
   - Pass to `linear-workflow`: action, issue UUID, config snapshot (team ID, project ID, workflow states), and relevant data (branch, plan path, phase, summary)

2. **If the plan has NO `## Linear Integration` section**:
   - Prompt the user: "Linear is enabled but this plan has no linked ticket. Create one?"
   - If yes → invoke `linear-manager` agent to create a ticket, then embed the `## Linear Integration` section in the plan
   - If no → proceed without Linear tracking

If `LINEAR_ENABLED` is false: skip all Linear invocations entirely.

**Linear failures must never block implementation.** If `linear-workflow` returns a warning, log it and continue.

---

## Branch Selection (MANDATORY - Before Any Implementation)

1. Run `git branch --show-current`
2. Ask the user: Stay on current / Branch out from current (suggest name) / Custom branch
3. Create branch if needed
4. If Linear tracking active: invoke `linear-workflow` with `implement_start` action

---

## Phase Execution Loop

For each phase in the plan:

### 1. Invoke `phase-executor` Agent

Spawn the `phase-executor` agent via Task tool with:
- Plan path
- Phase number
- Project guidelines path: from `GUIDELINES_PATH` (read from config)
- Context from previous phases (accumulate as you go)

### 2. Review Results

The agent returns an execution report with status: **SUCCESS / PARTIAL / BLOCKED**

- **SUCCESS**: Proceed to step 3
- **PARTIAL**: Review failures. Fix what you can, retry. If stuck, present to user.
- **BLOCKED**: Present the blocker to the user clearly and ask how to proceed.

### 3. Pause for Manual Verification

After automated verification passes, inform the user:
```
Phase [N] Complete - Ready for Manual Verification

Automated verification passed:
- [List checks]

Please perform the manual verification steps:
- [List manual items]

Let me know when manual testing is complete so I can proceed to Phase [N+1].
```

Do NOT check off manual verification items until confirmed by user. If executing multiple phases consecutively, skip the pause until the last phase.

### 4. Session Budget Check

After each phase, self-assess session context size. If approaching ~70k tokens, ask the user:
- **Continue anyway**
- **Stop and preserve progress** → follow Stop & Handoff Flow

---

## Frontend Phase Gate (MANDATORY - Before Frontend Work)

If the plan includes both backend and frontend phases, **pause before any frontend work** and ask:
- **Continue in this session**
- **Stop here** → follow Stop & Handoff Flow

---

## Frontend E2E Testing (CONDITIONAL)

If frontend changes were made and an E2E testing guide exists, ask the user:
- **Run automated E2E tests** → invoke the appropriate tester agent via Task tool
- **Skip, I'll test manually**

**Never invoke browser automation tools directly** — always delegate to tester agents via Task tool.

---

## Testing Guide Creation (After All Phases)

After ALL phases complete and automated verification passes, ask the user:
- **Yes, create a testing guide**
- **No, skip the guide**

If yes, invoke the `testing-guide-orchestrator` agent via Task tool with:
- Implementation summary
- Files changed (from `git diff`)
- Plan reference

---

## Linear Finalization

If Linear tracking is active, invoke `linear-workflow` with `implement_complete` action. The agent will move ticket to **Validation** status and post a completion summary comment. Do NOT move to Done — that happens after `/validate_plan` succeeds. The ticket flow is: In Progress → Validation → QA → Done.

---

## Stop & Handoff Flow (At Any Planned Stop Point)

Offer to create a handoff document:
- **Yes, create a handoff** → invoke `create_handoff` command
- **No, just stop**

Present a clear summary of what was completed and what remains.

---

## If You Get Stuck

- Read and understand all relevant code first
- Consider if the codebase has evolved since the plan was written
- Present the mismatch clearly and ask for guidance

## Resuming Work

If the plan has existing checkmarks:
- Trust completed work is done
- Pick up from the first unchecked item
- Verify previous work only if something seems off

Remember: You're implementing a solution, not just checking boxes. Keep the end goal in mind and maintain forward momentum.
