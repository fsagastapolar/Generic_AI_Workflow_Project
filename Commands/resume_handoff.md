---
description: Resume work from handoff document with context analysis and validation
---

# Resume Handoff

You are tasked with resuming work from a handoff document. Handoffs contain critical context, learnings, and next steps from previous sessions. If the handoff references a plan currently being implemented, you will hand off to `implement_plan` automatically.

## Step 1: Locate the Handoff

**If a direct file path was provided** (e.g., `/resume_handoff thoughts/shared/handoffs/2026-03-22_...md`):
- Skip to Step 2 immediately with that path.

**If no argument was provided**:
- List all files under `thoughts/shared/handoffs/` recursively (use Glob or Bash).
- Sort them by filename descending (filenames start with `YYYY-MM-DD_HH-MM-SS` so alphabetical descending = newest first).
- Present a numbered list to the user, newest first, like:
  ```
  Available handoffs (newest first):

  1. thoughts/shared/handoffs/2026-03-22_14-30-00_implement-auth.md
  2. thoughts/shared/handoffs/2026-03-21_09-15-00_create-dashboard.md
  3. thoughts/shared/handoffs/general/2026-03-20_11-00-00_general-refactor.md

  Which handoff would you like to resume? (Enter number or full path)

  Tip: You can skip this menu next time: /resume_handoff thoughts/shared/handoffs/...
  ```
- Wait for the user to select one, then proceed to Step 2 with that path.

**If the directory does not exist or is empty**:
- Tell the user: "No handoffs found in `thoughts/shared/handoffs/`. Have you run `/create_handoff` yet?"
- Stop.

## Step 2: Read the Handoff

Read the handoff document **completely** (no limit/offset). Extract:
- `plan_path` from the YAML frontmatter (if present)
- Task(s) and their statuses
- Recent changes
- Learnings
- Artifacts
- Action items and next steps

## Step 3: Route Based on Plan Path

### If `plan_path` is present in the frontmatter:

This handoff was created during a plan implementation. **Do not recreate a full analysis or new todo list** — instead, hand off to `implement_plan`.

Tell the user:
```
This handoff was created during implementation of:
  Plan: <plan_path>

Key context from the handoff:
- [Brief bullet list of tasks/status and most important learnings]

Handing off to implement_plan with this context...
```

Then invoke the `implement_plan` skill. The plan path is `<plan_path>` from the frontmatter. As you do, make sure the implement_plan session is aware of the handoff context: which phase was in progress, what was completed, what learnings to carry forward, and what the next steps are.

### If `plan_path` is NOT present:

Proceed with the standard resume flow below.

## Step 4: Standard Resume Flow (no plan_path)

### 4a. Read Referenced Artifacts

Read all files referenced in the handoff: plans, research docs, feature documents. Do NOT use a sub-agent for these — read them directly.

### 4b. Present Analysis

```
I've analyzed the handoff from [date]. Here's the current situation:

**Tasks:**
- [Task 1]: [Status from handoff]
- [Task 2]: [Status from handoff]

**Key Learnings:**
- [Learning with file:line reference]

**Artifacts Reviewed:**
- [Document]: [Key takeaway]

**Recommended Next Steps:**
1. [Most logical next action]
2. [Second priority]

Shall I proceed with [recommended action 1], or would you like to adjust?
```

### 4c. Get Confirmation, Then Execute

After the user confirms direction:
1. Create a task list (TaskCreate) from the handoff's action items.
2. Begin implementation, referencing learnings from the handoff throughout.
3. Apply patterns and approaches documented in the handoff.

## Guidelines

- **Never assume handoff state matches current state** — verify file references still exist.
- **Read the full handoff first** before doing anything else.
- **Leverage the Learnings section** — it contains hard-won context from the previous session.
- **When routing to implement_plan**, pass enough context so the new session doesn't need to re-read the handoff independently.
