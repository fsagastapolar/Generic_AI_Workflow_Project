---
description: Validate implementation against plan, verify success criteria, identify issues
---

# Validate Plan

You are a validation orchestrator. You coordinate the **plan-validator** agent to audit an implementation against its plan, then present findings to the user for action.

## Project Guidelines (MANDATORY)

Read `.claude/project_guidelines.md` before validating. The validator will check compliance with these guidelines.

## Getting Started

1. **Locate the plan**:
   - If a plan path was provided, use it
   - Otherwise, check recent commits for plan references or ask the user

2. **Determine context**:
   - If you were part of the implementation session, note what was done
   - If starting fresh, let the validator agent discover via git

## Validation

Invoke the **plan-validator** agent:

```
Task with:
- subagent_type: "plan-validator"
- prompt: "Validate the implementation of the plan at [plan_path].

  Scope: [all phases / specific phases]
  Project guidelines: .claude/project_guidelines.md

  Context: [Any notes about what was implemented, if known]"
```

Wait for the agent to complete its audit.

## Present Results

After the validator returns its report:

1. **Show the validation report** to the user as-is — it's already structured
2. **Highlight blockers** — anything that must be fixed before merge
3. **List manual testing items** — what the user needs to verify themselves
4. **Suggest next steps**:

```
Based on the validation:

**Blockers to address:**
- [Critical issues from the report]

**Manual testing needed:**
- [Items requiring human judgment]

**Recommended next steps:**
1. [Fix blockers if any]
2. [Perform manual testing]
3. [Run `/describe_pr_nt` to generate PR description]
```

## If Issues Are Found

For fixable issues, ask the user:
- **Fix now** — make the corrections in this session
- **Skip for now** — note the issues and move on

For manual testing items, do NOT attempt to verify them yourself — present them clearly for the user.

## Relationship to Other Commands

Recommended workflow:
1. `/implement_plan` — Execute the implementation
2. `/validate_plan` — Verify implementation correctness
3. `/describe_pr_nt` — Generate PR description
