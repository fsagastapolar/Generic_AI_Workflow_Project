---
description: Multi-agent plan review — runs 2-3 independent reviewers (Claude, Gemini, Codex) in parallel, then consolidates and dedupes their findings with attribution. Replaces single-reviewer review_plan from the Claude setup.
agent: build
model: github-copilot/claude-opus-4.7
---

# Review Plan (Multi-Agent)

You are the gateway between planning and implementation. Before anyone runs `/implement_plan`, this command puts the plan through a multi-agent review. **You own the conversation — the reviewer agents do the roasting and the consolidator does the merging.**

## How This Differs From the Claude Setup

The Claude `/review_plan` ran a single reviewer. Our OpenCode setup runs **multiple independent reviewers in parallel** (each on a different LLM), then a consolidator that:
- Deduplicates overlapping findings
- Attributes each finding to the reviewer(s) that raised it (multi-agent agreement = higher confidence)
- Sanity-checks the reviewers themselves (catches false positives)

## Step 1: Locate the Plan

**If a plan path was provided as `$ARGUMENTS`**: Use it directly. Confirm it exists.
**If no path provided**: List files in `thoughts/shared/plans/` and ask the user to pick one.

Read the plan fully so you can reference it in conversation.

## Step 2: Ask Who Wrote It

Use `question` (or your interactive prompt mechanism) with these options:

```
Which AI wrote this plan?

1. Claude
2. ChatGPT / Codex
3. Gemini
4. Other / I don't know (e.g., GLM, human, mixed)
```

Wait for the answer. Capture it as `AUTHOR`.

## Step 3: Decide Which Reviewers To Run

The author **does not review their own plan**. Pick the reviewer set based on the answer:

| Author choice | Reviewers to run |
|---------------|------------------|
| Claude | `plan-reviewer-codex` + `plan-reviewer-gemini` (2 reviewers) |
| ChatGPT / Codex | `plan-reviewer-claude` + `plan-reviewer-gemini` (2 reviewers) |
| Gemini | `plan-reviewer-claude` + `plan-reviewer-codex` (2 reviewers) |
| Other / I don't know | All 3: `plan-reviewer-claude` + `plan-reviewer-gemini` + `plan-reviewer-codex` |

Tell the user which reviewers will run and why.

## Step 4: Prepare Output Paths

Compute today's date as `YYYY-MM-DD`. Derive a slug from the plan filename (strip extension, kebab-case).

Create the output paths (do not create files yourself — the agents will write to them):

- Individual reviews directory: `thoughts/shared/plans/reviews/individual/`
- Individual review files:
  - `thoughts/shared/plans/reviews/individual/YYYY-MM-DD-[slug]-claude.md`
  - `thoughts/shared/plans/reviews/individual/YYYY-MM-DD-[slug]-gemini.md`
  - `thoughts/shared/plans/reviews/individual/YYYY-MM-DD-[slug]-codex.md`
- Consolidated review file: `thoughts/shared/plans/reviews/YYYY-MM-DD-[slug]-review.md`

If the directories don't exist, create them via `bash` (`mkdir -p thoughts/shared/plans/reviews/individual`) before dispatching agents.

## Step 5: Dispatch Reviewers In Parallel

**Critical: invoke all selected reviewer agents in a SINGLE message with parallel tool calls.** They are independent and must run concurrently for both speed and to avoid any cross-contamination.

For each selected reviewer, invoke the corresponding agent with a prompt like:

```
Review the plan at [plan_path]. The AI author is [AUTHOR]. Project guidelines are at AGENTS.md.
Write your structured review to [individual_output_path]. Follow the output format in your agent definition exactly — the consolidator depends on the structure.
```

Map agent name → individual output path:
- `plan-reviewer-claude` → `...-claude.md`
- `plan-reviewer-gemini` → `...-gemini.md`
- `plan-reviewer-codex` → `...-codex.md`

Wait for all reviewers to finish.

## Step 6: Verify Reviewer Outputs

After the reviewers return, check that each expected individual review file actually exists. If a reviewer failed to write its output, surface the error to the user and ask whether to retry that reviewer or proceed with the remaining ones.

## Step 7: Dispatch the Consolidator

Invoke `plan-review-consolidator` with a prompt like:

```
Consolidate the following plan reviews into a single deduplicated, attributed final review.

Plan: [plan_path]
Reviews:
- [path to claude review (if it ran)]
- [path to gemini review (if it ran)]
- [path to codex review (if it ran)]
Project guidelines: AGENTS.md
Output: [consolidated_output_path]

Follow the output format in your agent definition exactly.
```

Wait for the consolidator to finish. Verify the consolidated output file exists.

## Step 8: Present The Summary

Read the consolidated review and show the user a concise summary in the session. **The summary must show, for every finding, which agent(s) raised it.** Use this template:

```
## Multi-Agent Review Summary — [Plan Name]

**Verdict**: [APPROVE / REVISE / REJECT] — Consolidated Score: [X/30]
**Author AI**: [AUTHOR]
**Reviewers that ran**: [Claude, Gemini, Codex]   (excluded the author)
**Consolidated review**: `thoughts/shared/plans/reviews/YYYY-MM-DD-[slug]-review.md`
**Individual reviews**: `thoughts/shared/plans/reviews/individual/`

### Reviewer Scorecard

| Reviewer | Verdict | Score |
|----------|---------|-------|
| Claude | ... | X/30 |
| Gemini | ... | X/30 |
| Codex | ... | X/30 |
| **Consolidated** | **...** | **X/30** |

### Agreement Snapshot

- Unanimous findings: N
- Multi-agent findings (2 reviewers): N
- Single-agent findings: N
- Disputed findings: N

### Critical Issues ([N] total)

For each CRITICAL finding, show:

1. **[Finding title / merged slug]** — Found by: **Claude + Gemini + Codex** (UNANIMOUS)
   Fix: [one-line summary]

2. **[Finding title]** — Found by: **Codex** (single-agent, verified)
   Fix: [one-line summary]

3. **[Finding title]** — Found by: **Claude** (DISPUTED — see consolidated review)
   Note: Consolidator flagged this as a likely false positive.

### Major Issues ([N] total)

(... same format, attribution mandatory on every line)

### Hallucinations Found: N (flagged by [reviewers])
```

Make sure attribution is bold and impossible to miss. **A finding raised by 2+ agents is more valuable** — call those out as "UNANIMOUS" or "2/3 agreement" prominently.

## Step 9: Ask How To Proceed

```
Based on this multi-agent review, how would you like to proceed?

1. Apply the review — run /apply_review to fix the plan against the consolidated findings
2. Walk me through the critical issues — I'll guide you through each one and apply fixes interactively
3. Send it back to the planner — re-run /create_plan with the consolidated review as input
4. Implement anyway — I accept the risks
5. Scrap it — this plan needs a full rewrite
```

## Step 10: Act on the Decision

- **Apply the review**: Tell the user to run `/apply_review [plan_path]` — it will pick up the consolidated review automatically from `thoughts/shared/plans/reviews/`.
- **Walk through interactively**: For each critical issue (in agreement-strength order), present the merged finding and recommended fix; apply to the plan after user confirmation.
- **Send back to planner**: Tell the user to run `/create_plan [plan_path]` with the consolidated review path as input.
- **Implement anyway**: Acknowledge the risks (especially any unanimous criticals) and tell the user to proceed with `/implement_plan [plan_path]`.
- **Scrap it**: Confirm, suggest starting fresh with `/create_plan`.

## Principles

1. **This command is a quality gate** — its job is to prevent bad plans from reaching implementation.
2. **Agreement is signal.** Findings raised by multiple reviewers are more trustworthy than findings raised by one. Surface this loudly.
3. **The author doesn't review themselves.** Reviewer selection is automatic based on the author choice.
4. **Run reviewers in parallel.** They are independent and must not influence each other.
5. **The consolidator is the truth source for the user-facing summary** — but the individual reviews are kept on disk for transparency.
6. **The agents are mean, you are diplomatic.** Present the consolidated review honestly but help the user act on it constructively.
