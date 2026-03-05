---
description: Create implementation plan for highest priority Linear ticket ready for spec
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

## PART I - IF A TICKET IS MENTIONED

0c. use `linear` cli to fetch the selected item into thoughts with the ticket number - ./thoughts/shared/tickets/ENG-xxxx.md
0d. read the ticket and all comments to learn about past implementations and research, and any questions or concerns about them


### PART I - IF NO TICKET IS MENTIONED

0.  read .claude/commands/linear.md
0a. fetch the top 10 priority items from linear in status "ready for spec" using the MCP tools, noting all items in the `links` section
0b. select the highest priority SMALL or XS issue from the list (if no SMALL or XS issues exist, EXIT IMMEDIATELY and inform the user)
0c. use `linear` cli to fetch the selected item into thoughts with the ticket number - ./thoughts/shared/tickets/ENG-xxxx.md
0d. read the ticket and all comments to learn about past implementations and research, and any questions or concerns about them

### PART II - NEXT STEPS

think deeply

1. move the item to "plan in progress" using the MCP tools
1a. read ./claude/commands/create_plan.md
1b. determine if the item has a linked implementation plan document based on the `links` section
1d. if the plan exists, you're done, respond with a link to the ticket
1e. if the research is insufficient or has unaswered questions, create a new plan document following the instructions in ./claude/commands/create_plan.md

think deeply

2. when the plan is complete, `humanlayer thoughts sync` and attach the doc to the ticket using the MCP tools and create a terse comment with a link to it (re-read .claude/commands/linear.md if needed)
2a. move the item to "plan in review" using the MCP tools

think deeply, use TodoWrite to track your tasks. When fetching from linear, get the top 10 items by priority but only work on ONE item - specifically the highest priority SMALL or XS sized issue.

### PART III - When you're done


Print a message for the user (replace placeholders with actual values):

```
✅ Completed implementation plan for ENG-XXXX: [ticket title]

Approach: [selected approach description]

The plan has been:

Created at thoughts/shared/plans/YYYY-MM-DD-ENG-XXXX-description.md
Synced to thoughts repository
Attached to the Linear ticket
Ticket moved to "plan in review" status

Implementation phases:
- Phase 1: [phase 1 description]
- Phase 2: [phase 2 description]
- Phase 3: [phase 3 description if applicable]

View the ticket: https://linear.app/humanlayer/issue/ENG-XXXX/[ticket-slug]
```
