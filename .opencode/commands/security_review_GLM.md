---
description: Run a Semgrep-powered security review on specific features or the full project — produces severity-rated findings with remediation guidance
agent: build
subtask: true
---

# Security Review

You orchestrate security reviews by dispatching the **security-reviewer** agent. You own the conversation — the agent owns the scanning and analysis.

## Step 1: Determine Scope

**If a path or scope was provided as a parameter**: Use it directly.

**If no parameters provided**, respond with:
```
I'll help you run a security review. What would you like me to scan?

1. **Full project** — broad scan of the entire codebase
2. **Specific paths** — provide file paths or directories (e.g., `src/api/`, `src/auth/`)
3. **Specific feature** — describe the feature and I'll identify the relevant code
4. **Recent changes** — I'll review files changed on the current branch vs main

Please choose an option or provide specific paths/descriptions.
```

Wait for the user's input.

## Step 2: Identify Target Files (if needed)

If the user chose option 3 (feature) or gave a vague description:
- Use Grep/Glob to identify the relevant files
- Present the file list to the user for confirmation before scanning

If the user chose option 4 (recent changes):
- Run `git diff --name-only main...HEAD` to get changed files
- Present the list and confirm

## Step 3: Dispatch the Security Review

Invoke the **security-reviewer** agent via Task tool:

```
Task with:
- subagent_type: "security-reviewer"
- prompt: "Perform a security review with scope: [scope description]. Target paths: [paths]. Project guidelines are at .claude/project_guidelines.md. Write the report to thoughts/shared/security-reviews/YYYY-MM-DD-[scope-slug]-security-review.md"
```

## Step 4: Present Session Summary

After the agent completes, read the generated report and present a **concise summary** to the user:

```
## Security Review Complete

**Verdict**: [PASS / NEEDS REMEDIATION / CRITICAL RISK]
**Scope**: [what was scanned]
**Full report**: `thoughts/shared/security-reviews/YYYY-MM-DD-[scope-slug]-security-review.md`

### Findings Summary
| Severity | Count |
|----------|-------|
| Critical | X |
| High | X |
| Medium | X |
| Low | X |

### Top Priority Issues:
1. **[CRIT/HIGH-1 title]** — `file:line` — [one-line description]
2. **[CRIT/HIGH-2 title]** — `file:line` — [one-line description]
3. ...

### Quick Wins (low effort, high impact):
- [Finding] — [what to fix]
```

## Step 5: Offer Next Steps

Ask the user:

```
How would you like to proceed?

1. **Deep dive** — Walk me through the critical/high findings in detail
2. **Fix now** — I'll help remediate the top priority issues
3. **Create tickets** — Generate Linear tickets for each finding (grouped by priority)
4. **Re-scan** — Run again with a different scope or custom rules
5. **Done** — I've seen enough for now
```

Act on their choice:
- **Deep dive**: Read and explain each critical/high finding from the report, showing the vulnerable code and the fix
- **Fix now**: For each finding, show the current code, explain the fix, and apply it after user confirmation
- **Create tickets**: Generate Linear ticket descriptions grouped by severity (use linear-manager agent if available)
- **Re-scan**: Go back to Step 1 with new parameters
- **Done**: Acknowledge and remind them where the full report is saved

## Principles

1. **The summary is for the session, the report is for the record** — Keep the in-conversation summary brief and actionable. The full detail lives in the markdown report.
2. **Prioritize ruthlessly** — If there's 1 critical finding, that dominates the conversation. Don't let medium/low noise distract.
3. **The agent scans, you guide** — You handle scope decisions, user interaction, and follow-up. The security-reviewer agent handles the actual analysis.
4. **Don't alarm unnecessarily** — If the scan comes back clean, say so clearly. A PASS verdict is good news.
