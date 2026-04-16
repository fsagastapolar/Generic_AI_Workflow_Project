---
description: Resume work from handoff document with context analysis and validation
agent: build
subtask: true
---

You are tasked with resuming work from a handoff document. Handoffs contain critical context, learnings, and next steps from previous sessions. If the handoff references a plan currently being implemented, you will hand off to `implement_plan` automatically.

## Step 1: Locate the Handoff

**If a direct file path was provided**:
- Skip to Step 2 immediately with that path.

**If no argument was provided**:
- List all files under `thoughts/shared/handoffs/` recursively
- Sort by filename descending (newest first)
- Present a numbered list to the user
- Wait for the user to select one

**If the directory does not exist or is empty**:
- Tell the user: "No handoffs found in `thoughts/shared/handoffs/`. Have you run `/create_handoff` yet?"
- Stop.

## Step 2: Read the Handoff

Read the handoff document **completely**. Extract:
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

Then invoke the `implement_plan` command.

### If `plan_path` is NOT present:

Proceed with the standard resume flow:

### 4a. Read Referenced Artifacts
Read all files referenced in the handoff directly.

### 4b. Present Analysis
```
I've analyzed the handoff from [date]. Here's the current situation:

**Tasks:**
- [Task 1]: [Status]

**Key Learnings:**
- [Learning with file:line reference]

**Recommended Next Steps:**
1. [Most logical next action]

Shall I proceed with [recommended action 1], or would you like to adjust?
```

### 4c. Get Confirmation, Then Execute
1. Create a task list from the handoff's action items
2. Begin implementation, referencing learnings throughout

## Guidelines

- **Never assume handoff state matches current state** — verify file references still exist
- **Read the full handoff first** before doing anything else
- **Leverage the Learnings section** — it contains hard-won context
- **When routing to implement_plan**, pass enough context so the new session doesn't need to re-read the handoff independently
