---
description: Validate implementation against plan, verify success criteria, identify issues
agent: build
subtask: true
model: github-copilot/claude-opus-4.7
---

# Validate Plan

You are tasked with validating that an implementation plan was correctly executed. You delegate the heavy lifting to the `plan-validator` agent, handle Linear integration, create testing guides for QA, and present the results to the user.

**Commands own the conversation. Agents own the work.**

## Agent Dispatch Protocol (Cost Optimization)

Try the cheaper OpenCode agent first; fall back to Claude if it fails:

```bash
TMPFILE=$(mktemp /tmp/opencode_dispatch_XXXXXX.json)
timeout 120 opencode run --agent "plan-validator" --format json "<prompt>" > "$TMPFILE" 2>&1
EXIT_CODE=$?
RESULT=$(grep '"type":"text"' "$TMPFILE" | jq -r '.part.text // empty' 2>/dev/null)
RESULT_LEN=${#RESULT}
HAS_ERROR=$(grep -ciE "(token limit|rate limit|context length exceeded|quota exceeded|ECONNREFUSED)" "$TMPFILE" || true)
rm -f "$TMPFILE"
if [ $EXIT_CODE -ne 0 ] || [ $RESULT_LEN -lt 50 ] || [ "$HAS_ERROR" -gt 0 ]; then
  echo "OPENCODE_FALLBACK_NEEDED"
else
  echo "$RESULT"
fi
```

If `OPENCODE_FALLBACK_NEEDED`, spawn the Claude `plan-validator` agent via Task tool.

---

## Step 1: Locate the Plan & Extract Linear Context

If plan path provided, use it. Otherwise:
- Search recent commits for plan references
- Ask the user which plan to validate

Read the plan file and extract:
- The `## Linear Integration` section (Issue UUID, identifier, title)
- All phases and success criteria
- If Linear Integration exists, this command has **automatic Linear tracking**

### Linear Credentials & Setup
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

### Linear API Patterns
**Move ticket:** Use the resolved state UUID:
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation IssueUpdate($id:String!,$input:IssueUpdateInput!){issueUpdate(id:$id,input:$input){success issue{identifier state{name}}}}","variables":{"id":"ISSUE_UUID","input":{"stateId":"STATE_UUID"}}}' | jq .
```

**Add comment:**
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation CommentCreate($input:CommentCreateInput!){commentCreate(input:$input){success}}","variables":{"input":{"issueId":"ISSUE_UUID","body":"COMMENT"}}}' | jq .
```

**Do not let Linear API failures block validation.**

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

Spawn the `plan-validator` agent (via dispatch protocol) with:
- **Plan path**: The plan to validate
- **Scope**: Which phases (from Step 2)
- **Project guidelines path**: `.claude/project_guidelines.md`

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

After validation completes (regardless of pass/fail), post a validation comment on the Linear issue:

**On validation start**: Comment: `🔍 **[AI Model] Validation Log** — AI validation started for plan \`<plan-path>\`. Scope: [phases].`

**On validation complete (pass)**: Comment:
```
✅ **[AI Model] Validation Log** — Validation PASSED.

**AI Model**: [e.g., Claude Sonnet 4 / GLM-5.1]
**Scope**: [phases validated]
**Automated checks**: All passed
**Deviations**: [None / list]
**Blockers**: None

Implementation ready for QA testing.
```

**On validation complete (issues found)**: Comment:
```
⚠️ **[AI Model] Validation Log** — Validation completed with issues.

**AI Model**: [e.g., Claude Sonnet 4 / GLM-5.1]
**Scope**: [phases validated]
**Automated checks**: [X passed, Y failed]
**Blockers**: [list]
**Deviations**: [list]
**Recommendations**: [must-fix items]

Issues need to be resolved before QA.
```

## Step 7: Testing Guide Creation for QA

If validation passes (or issues are accepted), create testing guides for the QA tester:

1. Gather commit hash: `git rev-parse --short HEAD`
2. Invoke the `testing-guide-orchestrator` agent (via dispatch protocol) with:
   - Implementation summary
   - Files changed (from `git diff`)
   - Plan reference
   - Commit hash

The testing guides will be attached to the Linear issue in the next step.

## Step 8: Move to QA & Post Testing Info (If Linear Tracking Active)

If validation passed (or user accepted issues):

1. **Move ticket to QA** status
2. **Post QA handoff comment** with all testing information:

```
🧪 **QA Handoff** — Ready for manual testing.

**Commit**: `<short-hash>` (`<full-hash>`)
**Branch**: `<branch-name>`
**Plan**: `<plan-path>`

## Testing Guides
- **API E2E Guide**: `[path]` — [summary]
- **Frontend Test Spec**: `[path]` — [summary]
- **Manual Test Guide**: `[path]` — [summary]

## What Changed
- [List of key files modified/created]
- [Key functionality added/changed]

## Manual Verification Steps
1. [Step from validation report]
2. [Step from validation report]

## Known Issues / Deviations
- [Any deviations or known issues, or "None"]

## QA Focus Areas
- [Specific areas that need careful manual testing]
- [Edge cases to verify]
```

3. If any testing guide creation failed, note it in the comment and provide inline manual steps.

If validation failed with blockers: Keep ticket in **Validation** status. Do NOT move to QA until issues are resolved.

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
