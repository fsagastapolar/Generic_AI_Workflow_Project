---
description: Implement technical plans from thoughts/shared/plans with verification
agent: build
subtask: true
model: zai-coding-plan/glm-5.1
---

# Implement Plan

You are tasked with implementing an approved technical plan from `thoughts/shared/plans/`. You orchestrate the work by delegating each phase to the `phase-executor` agent and handling user interaction yourself.

**Commands own the conversation. Agents own the work.**

## Code Quality
- Prefer correct, complete implementations over minimal ones.
- Use appropriate data structures and algorithms — don't brute-force what has a known better solution.
- When fixing a bug, fix the root cause, not the symptom.
- If something I asked for requires error handling or validation to work reliably, include it without asking.

## Agent Dispatch Protocol (Cost Optimization)

When spawning any of the following agents, try the cheaper OpenCode agent first; fall back to Claude if it fails:

**Agents with OpenCode counterparts:** `phase-executor`, `testing-guide-orchestrator`, `e2e-test-guide-creator`, `linear-manager`

```bash
TMPFILE=$(mktemp /tmp/opencode_dispatch_XXXXXX.json)
timeout 120 opencode run --agent "<agent-name>" --format json "<prompt>" > "$TMPFILE" 2>&1
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

If `OPENCODE_FALLBACK_NEEDED`, spawn the equivalent Claude agent via Task tool.

---

## Getting Started

When given a plan path:
- Read the plan completely and check for any existing checkmarks (- [x])
- Read the original ticket and all files mentioned in the plan
- **Read files fully** - never use limit/offset parameters
- **Check for `## Linear Integration` section** — if present, follow the Linear Lifecycle Protocol below
- Create a todo list to track your progress
- If no plan path provided, ask for one

## Linear Lifecycle Protocol (Always-On)

If the plan contains a `## Linear Integration` section with an Issue UUID, Linear tracking is **automatically enabled**.

### Credentials & Setup
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

Cache the state name→UUID mapping for the session.

### State Transitions
**On start** (after branch selection): Move to **In Progress**, comment: `🤖 **AI Implementation Log** — Implementation started on branch \`<branch>\`. Plan: \`<path>\``

**After each phase**: Comment: `🤖 **AI Implementation Log** — Phase N: [Name] completed. [Summary]`

**On difficulties**: Comment: `🤖 **AI Implementation Log** — ⚠️ [Description]. [Resolution]`

**On complete**: Move ticket to **Validation**, comment: `🤖 **AI Implementation Log** — All phases completed. Implementation moving to AI validation. Summary: [brief summary of what was implemented]`

### API Patterns
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

**Do not let Linear API failures block implementation.**

---

## Branch Selection (MANDATORY - Before Any Implementation)

1. Run `git branch --show-current`
2. Ask the user: Stay on current / Branch out from current (suggest name) / Custom branch
3. Create branch if needed
4. If Linear tracking active: move to In Progress, post start comment

---

## Phase Execution Loop

For each phase in the plan:

### 1. Invoke `phase-executor` Agent

Spawn the `phase-executor` agent (via dispatch protocol) with:
- Plan path
- Phase number
- Project guidelines path: `.claude/project_guidelines.md`
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

**Never invoke Playwright tools directly** — always delegate to tester agents via Task tool.

---

## Testing Guide Creation (After All Phases)

After ALL phases complete and automated verification passes, ask the user:
- **Yes, create a testing guide**
- **No, skip the guide**

If yes, invoke the `testing-guide-orchestrator` agent (via dispatch protocol) with:
- Implementation summary
- Files changed (from `git diff`)
- Plan reference

---

## Linear Finalization

If Linear tracking is active, move ticket to **Validation** status and post a completion summary comment. Do NOT move to Done — that happens after `/validate_plan` succeeds. The ticket flow is: In Progress → Validation → QA → Done.

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
