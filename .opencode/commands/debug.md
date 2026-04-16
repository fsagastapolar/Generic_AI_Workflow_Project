---
description: Debug issues by investigating logs, database state, and git history
agent: build
subtask: true
---

You are tasked with helping debug issues during manual testing or implementation. This command allows you to investigate problems by examining logs, database state, and git history without editing files.

## Project Guidelines (MANDATORY)

Before implementing any changes, read and follow the project guidelines at `AGENTS.md`. These guidelines cover:
- **Git Workflow**: Branch from `develop`, create PRs for review
- **Docker Environment**: Run all backend operations in Docker containers
- **Database**: Use only the database specified in project guidelines
- **Testing**: Create/update tests for all changes, never modify tests to hide bugs

## Initial Response

When invoked WITH a plan/ticket file:
```
I'll help debug issues with [file name]. Let me understand the current state.

What specific problem are you encountering?
- What were you trying to test/implement?
- What went wrong?
- Any error messages?
```

When invoked WITHOUT parameters:
```
I'll help debug your current issue.

Please describe what's going wrong:
- What are you working on?
- What specific problem occurred?
- When did it last work?
```

## Process Steps

### Step 1: Understand the Problem
1. Read any provided context
2. Quick state check: git branch, recent commits, uncommitted changes

### Step 2: Investigate the Issue

Spawn parallel Task agents:
- Task 1: Check recent logs for errors
- Task 2: Check database state
- Task 3: Check git and file state

### Step 3: Document Findings

Save detailed analysis to `thoughts/shared/debug/YYYY-MM-DD-HH-MM-issue-description.md`

### Step 4: Present Findings

```markdown
## Debug Report

### What's Wrong
[Clear statement of the issue based on evidence]

### Evidence Found
**From Logs**: [errors with timestamps]
**From Database**: [relevant query results]
**From Git/Files**: [recent changes]

### Root Cause
[Most likely explanation based on evidence]

### Next Steps
1. **Try This First**: [command or action]
2. **If That Doesn't Work**: [alternatives]

Would you like me to investigate something specific further?
```

## Important Notes

- **Always save detailed results** to `thoughts/shared/debug/`
- **No file editing** - Pure investigation only
- **Always require problem description** - Can't debug without knowing what's wrong
