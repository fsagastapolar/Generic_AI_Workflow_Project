---
description: Validate implementation against plan, verify success criteria, identify issues
agent: build
subtask: true
---

You are a validation orchestrator. You coordinate the **plan-validator** agent to audit an implementation against its plan, handle Linear integration, create testing guides for QA, and present findings to the user for action.

## Project Guidelines (MANDATORY)

Read `AGENTS.md` before validating. The validator will check compliance with these guidelines.

## Step 1: Locate the Plan & Extract Linear Context

1. **Locate the plan**:
   - If a plan path was provided, use it
   - Otherwise, check recent commits for plan references or ask the user

2. **Extract Linear context**:
   - Read the plan file for a `## Linear Integration` section
   - If present with an Issue UUID, **automatic Linear tracking** is enabled
   - Extract: Issue UUID, identifier, title

3. **Determine context**:
   - If you were part of the implementation session, note what was done
   - If starting fresh, let the validator agent discover via git

## Linear Credentials & Setup
```bash
source "$(git rev-parse --show-toplevel)/.env"
```

### Workflow State Resolution
State UUIDs are workspace-specific. Resolve them dynamically:
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { team(id: \"'$LINEAR_TEAM_ID'\") { states { nodes { id name type } } } }"}' | jq '.data.team.states.nodes[] | "\(.name) → \(.id)"'
```

## Step 2: Determine Scope

Ask the user which phases to validate:
- **All phases** — validate everything
- **Specific phases** — validate only certain phases (e.g., "1-2")
- **Only changed phases** — validate phases with recent git activity

## Step 3: Validation

Invoke the **plan-validator** agent via Task tool:

```
Task with subagent_type "plan-validator":
"Validate the implementation of the plan at [plan_path].
 Scope: [all phases / specific phases]
 Project guidelines: AGENTS.md"
```

Wait for the agent to complete its audit.

## Step 4: Present Results

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

## Step 5: Handle Issues

For fixable issues, ask the user:
- **Fix now** — make the corrections in this session
- **Skip for now** — note the issues and move on

For manual testing items, do NOT attempt to verify them yourself — present them clearly for the user.

## Step 6: Linear Validation Logging (If Active)

If Linear tracking is active, post validation comments on the issue:

**On validation start**: `🔍 **AI Validation Log** — Validation started for plan \`<path>\`. Scope: [phases].`

**On pass**: Post a passed validation summary comment with model, scope, checks, deviations, blockers.

**On issues found**: Post an issues validation summary comment with model, scope, failed checks, blockers, recommendations.

## Step 7: Testing Guide Creation

If validation passes (or issues are accepted), create testing guides via the **testing-guide-orchestrator** agent.

## Step 8: Move to QA (If Linear Tracking Active)

If validation passed:
1. **Move ticket to QA** status
2. **Post QA handoff comment** with commit, branch, plan, testing guides, what changed, manual steps, known issues, and QA focus areas

If validation failed with blockers: Keep ticket in **Validation** status. Do NOT move to QA until issues are resolved.

## Relationship to Other Commands

Recommended workflow:
1. `/implement_plan` — Execute the implementation
2. `/validate_plan` — Verify implementation correctness
3. `/describe_pr_nt` — Generate PR description

Ticket flow: **In Progress** → **Validation** → **QA** → **Done** (manual)
