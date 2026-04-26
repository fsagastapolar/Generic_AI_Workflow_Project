---
description: Ruthlessly review an implementation plan before executing it — identifies weak spots, hallucinations, and AI-specific pitfalls
---

# Review Plan

You are the gateway between planning and implementation. Before anyone runs `/implement_plan`, this command puts the plan through a brutal review. **You own the conversation — the plan-reviewer agent owns the roast.**

## Step 1: Locate the Plan

**If a plan path was provided**: Use it directly.
**If no path provided**: List files in `thoughts/shared/plans/` and ask the user to pick one.

Read the plan fully so you can reference it in conversation.

## Step 2: Determine Who Wrote It

First, extract the author from the plan document start information by looking for:

`AI Author: <value>`

If that field exists and is unambiguous, use it directly.

If the field is missing or ambiguous, use `AskUserQuestion` with these options:

```
Which AI wrote this plan?

1. Claude
2. GLM
3. ChatGPT / Gemini
4. Other / I don't know
```

Capture the final value as `author`.

## Step 3: Dispatch the Review

Capture `review_start_time` (local timestamp) right before dispatching the reviewer. Capture `review_end_time` after the review is saved. Compute duration in hours/minutes for the plan header.

Invoke the **plan-reviewer** agent via Task tool:

```
Task with:
- subagent_type: "plan-reviewer"
- prompt: "Review the plan at [plan_path]. The AI author is [author]. Project guidelines are at .claude/project_guidelines.md"
```

## Step 4: Save the Review

After the agent returns its review, **save the full review as a markdown file**:

- Path: `thoughts/shared/plans/reviews/YYYY-MM-DD-[plan-name]-review.md`
- The file should contain the complete review output from the agent (scores, roast, hallucination check, issues, recommendations, verdict)

## Step 5: Update the Plan Header + Annex

After saving the review, update the **plan file itself** with review metadata and an annex entry.

Add or update these sections near the top of the plan (right after the title, before `## Overview`):

```
## Plan Metadata
- **AI Author**: [value]
- **Created**: [YYYY-MM-DD]
- **Last Updated**: [YYYY-MM-DD]
- **Review Status**: [Not Reviewed / Reviewed]
- **Review Count**: [N]

## Review History
- Review [N]: [YYYY-MM-DD HH:MM] — Duration: [Hh Mm], Reviewers: [Reviewer A, Reviewer B], Verdict: [APPROVE/REVISE/REJECT], Review: `[review_path]`
```

Append a new review entry (increment `Review Count`). If sections are missing, create them with sensible defaults.

Then add an annex section at the end of the plan (or create it if missing):

```
## Review Annex

### Review [N] Summary
- **Found By**: [Reviewer(s)]
- **Applied**: No (pending apply_review)
- **Brief**: [1-3 bullets summarizing the most important findings and recommended fixes]
```

Use the reviewer names based on the agent(s) that ran.

## Step 6: Present a Summary

Show the user a **concise summary** in the session:

```
## Review Summary for [Plan Name]

**Verdict**: [APPROVE / REVISE / REJECT] — Score: [X/30]
**Author AI**: [author]
**Full review saved to**: `thoughts/shared/plans/reviews/YYYY-MM-DD-[plan-name]-review.md`

### Score Highlights:
- [Worst scoring dimension]: [score] — [one-liner]
- [Second worst]: [score] — [one-liner]

### Critical Issues ([N] found):
1. [Issue title] — [one-line summary of the fix]
2. [Issue title] — [one-line summary of the fix]

### Hallucinations Found: [N of M paths checked failed]
```

Then ask via `AskUserQuestion`:

```
Based on this review, how would you like to proceed?

1. Apply the review now — I'll run the apply-review workflow in this same session
2. Walk through critical issues interactively — I'll guide fixes one by one
3. Send it back to the planner now — I'll run the create-plan workflow in this same session
4. Implement anyway — I accept the risks
5. Scrap it — this plan needs a full rewrite
```

## Step 7: Act on the Decision

- **Apply review now**: Do not ask the user to run another command manually. Continue in this session. Preferred: invoke `/apply_review [plan_path]` as a subtask so it picks up the matching review; fallback: run the equivalent apply-review workflow directly by dispatching `plan-reviser`.
- **Walk through interactively**: Walk through each critical issue from the review. For each, present the recommended fix and apply it to the plan file after user confirmation.
- **Send back to planner now**: Do not ask the user to run another command manually. Continue in this session and invoke `/create_plan [plan_path]` as a subtask, including the review path as required context.
- **Implement anyway**: Acknowledge the risks and tell the user to proceed with `/implement_plan [plan_path]`.
- **Scrap it**: Confirm, and suggest the user start fresh with `/create_plan`.

## Principles

1. **This command is a quality gate** — its job is to prevent bad plans from reaching implementation
2. **The agent is mean, you are diplomatic** — present the review honestly but help the user act on it constructively
3. **No command ping-pong** — when the user selects a follow-up workflow, execute it in-session via subtask/delegation instead of asking them to run a separate command manually
4. **Every plan should go through this** — especially AI-generated ones
