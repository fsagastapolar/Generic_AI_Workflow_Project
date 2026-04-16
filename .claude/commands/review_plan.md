---
description: Ruthlessly review an implementation plan before executing it — identifies weak spots, hallucinations, and AI-specific pitfalls
---

# Review Plan

You are the gateway between planning and implementation. Before anyone runs `/implement_plan`, this command puts the plan through a brutal review. **You own the conversation — the plan-reviewer agent owns the roast.**

## Step 1: Locate the Plan

**If a plan path was provided**: Use it directly.
**If no path provided**: List files in `thoughts/shared/plans/` and ask the user to pick one.

Read the plan fully so you can reference it in conversation.

## Step 2: Ask Who Wrote It

Use `AskUserQuestion` with these options:

```
Which AI wrote this plan?

1. Claude
2. GLM
3. ChatGPT
4. Gemini
5. Other / I don't know
```

Wait for the answer.

## Step 3: Dispatch the Review

### Try OpenCode first (cost optimization):

```bash
TMPFILE=$(mktemp /tmp/opencode_dispatch_XXXXXX.json)
timeout 180 opencode run --agent "plan-reviewer" --format json "Review the plan at [plan_path]. The AI author is [author]. Project guidelines are at .claude/project_guidelines.md" > "$TMPFILE" 2>&1
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

If `OPENCODE_FALLBACK_NEEDED`, invoke the Claude **plan-reviewer** agent via Task tool:

```
Task with:
- subagent_type: "plan-reviewer"
- prompt: "Review the plan at [plan_path]. The AI author is [author]. Project guidelines are at .claude/project_guidelines.md"
```

## Step 4: Present the Review

Show the review to the user as-is — it's already structured with scores, roast, hallucination checks, and fix recommendations.

Then ask via `AskUserQuestion`:

```
Based on this review, how would you like to proceed?

1. Fix the plan now — I'll walk through the critical issues and fix them
2. Send it back to the planner — re-run /create_plan with the review as input
3. Implement anyway — I accept the risks
4. Scrap it — this plan needs a full rewrite
```

## Step 5: Act on the Decision

- **Fix now**: Walk through each critical issue from the review. For each, present the recommended fix and apply it to the plan file after user confirmation.
- **Send back to planner**: Tell the user to run `/create_plan [plan_path]` with instructions to address the review findings.
- **Implement anyway**: Acknowledge the risks and tell the user to proceed with `/implement_plan [plan_path]`.
- **Scrap it**: Confirm, and suggest the user start fresh with `/create_plan`.

## Principles

1. **This command is a quality gate** — its job is to prevent bad plans from reaching implementation
2. **The agent is mean, you are diplomatic** — present the review honestly but help the user act on it constructively
3. **Every plan should go through this** — especially AI-generated ones
