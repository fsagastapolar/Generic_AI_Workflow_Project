---
description: Execute ralph plan and implementation for a ticket
---

## Project Guidelines (MANDATORY)

Before creating any implementation plan, read and understand the project guidelines at `.claude/project_guidelines.md`. These guidelines are CRITICAL and must be incorporated into your plan:

**Key Guidelines to Follow:**
- **Git Workflow**: Always branch from `develop`, never commit directly to main/develop
- **Docker Environment**: Backend MUST run in Docker (`app` service), never locally
- **Database**: MySQL ONLY via Docker (`mysql` service), NEVER SQLite
- **Testing**: All changes require tests, never modify tests to hide bugs
- **Manual Testing**: Plans must include manual testing steps for the testing guide

**Incorporate these into your plan**:
- Include proper git workflow steps (create branch from develop)
- Specify Docker commands for backend operations (using `app` or `mysql` services)
- Never suggest SQLite for any purpose
- Include comprehensive test requirements in success criteria
- Plan for manual testing documentation to be created after implementation
- If the plan includes **API/backend modifications**, include a step to create an API E2E testing guide (after implementation) using the `e2e-test-guide-creator` agent
- If the plan includes **frontend modifications**, include a step to create a frontend E2E testing guide (after implementation) for the `angular-tester` agent

**IMPORTANT**: If the plan contradicts these guidelines, STOP and revise it before presenting to the user.

1. use SlashCommand() to call /ralph_plan with the given ticket number
2. use SlashCommand() to call /ralph_impl with the given ticket number
