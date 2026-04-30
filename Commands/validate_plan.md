---
description: Validate implementation against plan, verify success criteria, identify issues, update Linear
---

# Validate Plan

You are tasked with validating that an implementation plan was correctly executed. You delegate the heavy lifting to the `plan-validator` agent, handle Linear integration, create testing guides for QA, and present the results to the user.

**Commands own the conversation. Agents own the work.**

---

## Config Read (At Startup)

1. Read `project.config.json` from the repository root
2. Set `LINEAR_ENABLED = config.linear?.enabled === true`
3. Set `GUIDELINES_PATH = config.project?.guidelinesPath || '.claude/project_guidelines.md'`
4. If the config file does not exist, proceed with defaults: `LINEAR_ENABLED = false`, `GUIDELINES_PATH = '.claude/project_guidelines.md'`

---

## Step 1: Locate the Plan & Extract Linear Context

If plan path provided, use it. Otherwise:
- Search recent commits for plan references
- Ask the user which plan to validate

Read the plan file and extract:
- The `## Linear Integration` section (Issue UUID, identifier, title)
- All phases and success criteria

If Linear Integration exists AND `LINEAR_ENABLED` is true, this command has **automatic Linear tracking**.

### Determine AI Model Identity

Identify the current AI model and include it in all Linear comments:
- **If running as Claude** (via Task tool fallback): Report as `Claude` with the specific model if known
- **If running as OpenCode/GLM**: Report as `GLM-5.1` or the model from the command's frontmatter

## Step 2: Determine Scope

Ask the user which phases to validate:
- **All phases** — validate everything
- **Specific phases** — validate only certain phases (e.g., "1-2")
- **Only changed phases** — validate phases with recent git activity

## Step 3: Invoke `plan-validator` Agent

Spawn the `plan-validator` agent via Task tool with:
- **Plan path**: The plan to validate
- **Scope**: Which phases (from Step 2)
- **Project guidelines path**: from `GUIDELINES_PATH` (read from config)

The agent will:
- Read the full plan
- Gather git evidence (`git log`, `git diff`)
- Run all automated verification commands
- Check project guidelines compliance
- Compare planned vs actual changes
- Assess edge cases and error handling
- Return a structured validation report

## Step 4: Present Results

Show the validation report to the user. Highlight:
- **Blockers**: Issues that must be fixed before merge
- **Failures**: Automated verification commands that failed
- **Deviations**: Changes that differ from the plan
- **Manual testing needed**: Steps requiring human verification

## Step 5: Handle Issues

Offer the user options:
- **Fix issues now** — address fixable problems immediately
- **Skip** — accept the issues and move on
- **Create follow-up plan** — create a new plan to address the issues

For each fixable issue, explain what needs to change and ask if you should proceed.

## Step 6: Linear Validation Logging (If Linear Tracking Active)

If `LINEAR_ENABLED` AND the plan has a `## Linear Integration` section with an Issue UUID:

Invoke `linear-workflow` agent via Task tool with action `validate` and appropriate sub-action:

1. **On validation start** → `linear-workflow` with sub-action `start`
2. **On validation complete (pass)** → `linear-workflow` with sub-action `pass`
3. **On validation complete (issues found)** → `linear-workflow` with sub-action `fail`

Pass to `linear-workflow`: action, sub-action, issue UUID, config snapshot, AI model identity, validation data (scope, checks, blockers, deviations).

If `LINEAR_ENABLED` is false or plan has no Linear Integration: skip all Linear steps.

**Linear failures must never block validation.** If `linear-workflow` returns a warning, log it and continue.

## Step 7: Testing Guide Creation for QA

If validation passes (or issues are accepted), create testing guides for the QA tester:

1. Gather commit hash: `git rev-parse --short HEAD`
2. Invoke the `testing-guide-orchestrator` agent via Task tool with:
   - Implementation summary
   - Files changed (from `git diff`)
   - Plan reference
   - Commit hash

The testing guides will be attached to the Linear issue in the next step.

## Step 8: Move to QA & Post Testing Info (If Linear Tracking Active)

If validation passed (or user accepted issues) AND Linear tracking is active:

Invoke `linear-workflow` agent via Task tool with action `validate`, sub-action `qa`, passing:
- Issue UUID, config snapshot, commit hash, branch, plan path
- Testing guide paths and summaries
- What changed (files modified/created)
- Manual verification steps
- Known issues / deviations
- QA focus areas

If validation failed with blockers: `linear-workflow` keeps ticket in **Validation** status. Do NOT move to QA until issues are resolved.

---

## Relationship to Other Commands

Recommended workflow:
1. `/implement_plan` — Execute the implementation → moves ticket to **Validation**
2. `/commit` — Create atomic commits for changes
3. `/validate_plan` — Verify implementation → moves ticket to **QA** (if passed)
4. `/describe_pr` — Generate PR description

Ticket flow: **In Progress** → **Validation** → **QA** → **Done** (manual)

The validation works best after commits are made, as the agent can analyze git history to understand what was implemented.

Remember: Good validation catches issues before they reach production. Be constructive but thorough.
