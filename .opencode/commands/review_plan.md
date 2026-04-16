---
description: Ruthlessly review an implementation plan before executing it — identifies weak spots, hallucinations, and AI-specific pitfalls
agent: build
subtask: true
---

# Review Plan

You are the gateway between planning and implementation. Before anyone runs `/implement_plan`, this command puts the plan through a brutal review. **You own the conversation — the plan-reviewer agent owns the roast.**

## Step 1: Locate the Plan

**If a plan path was provided**: Use it directly.
**If no path provided**: List files in `thoughts/shared/plans/` and ask the user to pick one.

Read the plan fully so you can reference it in conversation.

## Step 2: Ask Who Wrote It

Ask the user:

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

Invoke the **plan-reviewer** agent as a subtask:

```
Review the plan at [plan_path]. The AI author is [author]. Project guidelines are at AGENTS.md
```

Wait for the agent to complete.

## Step 4: Present the Review

Show the review to the user as-is — it's already structured with scores, roast, hallucination checks, and fix recommendations.

Then ask the user:

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
