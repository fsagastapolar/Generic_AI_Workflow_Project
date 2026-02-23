---
description: Implement technical plans from thoughts/shared/plans with verification
---

# Implement Plan

You are tasked with implementing an approved technical plan from `thoughts/shared/plans/`. These plans contain phases with specific changes and success criteria.

## Getting Started

When given a plan path:
- Read the plan completely and check for any existing checkmarks (- [x])
- Read the original ticket and all files mentioned in the plan
- **Read files fully** - never use limit/offset parameters, you need complete context
- Think deeply about how the pieces fit together
- Create a todo list to track your progress
- Start implementing if you understand what needs to be done

If no plan path provided, ask for one.

## Branch Selection (MANDATORY - Before Any Implementation)

Before reading the plan or touching any code, you must determine which branch to work on:

1. **Get the current branch**: Run `git branch --show-current` to find out the active branch.

2. **Present options to the user** using `AskUserQuestion` with these three choices:
   - **Stay on current branch** (`<current-branch-name>`) — continue working where you are
   - **Branch out from current** — suggest a branch name derived from the plan filename or ticket (e.g. `feature/eng-1234-short-description`), show it clearly as the suggestion
   - **Custom branch name** — let the user type their own

3. **If the user selects "Branch out"** (either the suggested name or a custom one):
   - Run `git checkout -b <branch-name>` before proceeding
   - Confirm to the user that the new branch was created and you are now on it

4. **Then continue** with reading the plan and implementing.

## Implementation Philosophy

Plans are carefully designed, but reality can be messy. Your job is to:
- Follow the plan's intent while adapting to what you find
- Implement each phase fully before moving to the next
- Verify your work makes sense in the broader codebase context
- Update checkboxes in the plan as you complete sections

When things don't match the plan exactly, think about why and communicate clearly. The plan is your guide, but your judgment matters too.

If you encounter a mismatch:
- STOP and think deeply about why the plan can't be followed
- Present the issue clearly:
  ```
  Issue in Phase [N]:
  Expected: [what the plan says]
  Found: [actual situation]
  Why this matters: [explanation]

  How should I proceed?
  ```

## Project Guidelines (MANDATORY)

Before starting implementation, read and follow the project guidelines at `.claude/project_guidelines.md`. These guidelines cover:
- Git workflow (branching from develop, PR process)
- Docker vs local environment rules
- Testing requirements and guardrails
- Technical best practices (MySQL, Eloquent, Seeders)
- Documentation sync requirements

**You MUST adhere to these guidelines throughout implementation.**

## Verification Approach

After implementing a phase:
- Run the success criteria checks (usually `make check test` covers everything)
- Fix any issues before proceeding
- Update your progress in both the plan and your todos
- Check off completed items in the plan file itself using Edit
- **Pause for human verification**: After completing all automated verification for a phase, pause and inform the human that the phase is ready for manual testing. Use this format:
  ```
  Phase [N] Complete - Ready for Manual Verification

  Automated verification passed:
  - [List automated checks that passed]

  Please perform the manual verification steps listed in the plan:
  - [List manual verification items from the plan]

  Let me know when manual testing is complete so I can proceed to Phase [N+1].
  ```

If instructed to execute multiple phases consecutively, skip the pause until the last phase. Otherwise, assume you are just doing one phase.

do not check off items in the manual testing steps until confirmed by the user.


## Manual Testing Documentation (MANDATORY)

After completing ALL phases and ALL automated verification passes, you MUST create appropriate testing guides before marking the implementation as complete.

### Testing Guide Strategy

Based on what was implemented, create the appropriate testing guides:

### E2E Guide Confirmation (MANDATORY - Before Creating Any Guide)

Before creating any testing guide, **ask the user** whether they want it generated:

Use `AskUserQuestion` with two options:
- **Yes, create the guide** — proceed with the guide creation steps below
- **No, skip the guide** — mark implementation complete without creating a guide

Only proceed with guide creation if the user confirms.

---

#### For API/Backend Changes: Create E2E API Test Guide

If the implementation includes **API endpoints, backend logic, or database changes**, invoke the `e2e-test-guide-creator` agent:

1. **Invoke e2e-test-guide-creator as a Task**:
   ```
   Use the Task tool with:
   - subagent_type: "e2e-test-guide-creator"
   - description: "Generate comprehensive API E2E test guide"
   - prompt: "Create a comprehensive E2E API test guide for the implementation in [PR/branch name]. 
     
     Context:
     - Implementation: [Brief summary of what was implemented]
     - API endpoints modified/added: [List endpoints]
     - Files changed: [Key files from the diff]
     - Database changes: [Migrations, seeders]
     
     Generate a complete test guide at thoughts/shared/e2e-test-guides/YYYY-MM-DD-[feature]-api-test-guide.md with:
     - Ready-to-run curl commands with full headers and JSON bodies
     - Seeded data IDs from database seeders (users, entities)
     - Authentication token retrieval steps
     - SQL verification queries using docker exec
     - Entity creation steps when seeded data insufficient
     - All docker exec commands for backend/database operations
     - Edge case testing (validation errors, authorization failures)
     
     Make it copy-paste ready to minimize QA tester effort."
   ```

2. **Wait for the agent to generate the guide** - it will research the codebase, locate seeders, analyze endpoints, and create a comprehensive guide

3. **Review and present**:
   ```
   API E2E Test Guide Created
   
   The e2e-test-guide-creator agent has generated a comprehensive API test guide at:
   `thoughts/shared/e2e-test-guides/YYYY-MM-DD-[feature]-api-test-guide.md`
   
   The guide includes:
   - Ready-to-run curl commands for all endpoints
   - Seeded user/entity IDs from DatabaseSeeder
   - Authentication setup with complete steps
   - SQL verification queries
   - Docker exec commands for all operations
   - Edge case scenarios
   
   Please use this guide to verify the API functionality.
   ```

#### For Manual UI/General Testing: Create Manual Test Guide

For features requiring manual verification (UI interactions, visual testing, or general workflows):

1. **Create the file**: `thoughts/shared/testing/YYYY-MM-DD-ENG-XXXX-manual-test-guide.md`
   - Use today's date
   - Include ticket number if applicable
   - Example: `thoughts/shared/testing/2025-12-28-ENG-1234-manual-test-guide.md`

2. **Use the template from project guidelines**: See `.claude/project_guidelines.md` "Manual Testing Documentation" section for the complete template

3. **Include comprehensive test scenarios**:
   - Step-by-step instructions for testing each implemented feature
   - Expected results for each scenario
   - Edge cases and boundary conditions
   - Regression testing steps for related features
   - Prerequisites (Docker status, database state, etc.)

4. **Present to user**:
   ```
   Implementation Complete - Manual Testing Guide Created

   I've created a comprehensive manual testing guide at:
   `thoughts/shared/testing/YYYY-MM-DD-ENG-XXXX-manual-test-guide.md`

   Please review the guide and perform the manual testing steps to verify:
   - [List key scenarios from the guide]

   Let me know if you find any issues during testing.
   ```

**Decision Matrix - Which Guide(s) to Create:**

| Implementation Type | Create API E2E Guide | Create Manual Guide | Create Frontend E2E Guide |
|---------------------|----------------------|---------------------|---------------------------|
| Backend API only | ✅ Yes (invoke e2e-test-guide-creator) | Optional (if complex workflows) | ❌ No |
| Frontend only | ❌ No | Optional | ✅ Yes (for [this_project_frontend_playwright_tester_agent]) |
| Full-stack (API + UI) | ✅ Yes (invoke e2e-test-guide-creator) | Optional | ✅ Yes (for [this_project_frontend_playwright_tester_agent]) |
| Database/infra only | ❌ No | ✅ Yes | ❌ No |

**IMPORTANT**: 
- For API changes, ALWAYS use the `e2e-test-guide-creator` agent (via Task tool) - do not write API test guides manually
- The agent will research seeders, analyze endpoints, and generate complete curl commands
- Do not mark implementation complete until appropriate testing guide(s) are created

## Frontend Phase Gate (MANDATORY - Before Starting Frontend Work)

If the plan includes both backend and frontend phases, you **MUST pause before beginning any frontend work** and ask the user how they want to proceed.

Use `AskUserQuestion` with these options:
- **Continue in this session** — proceed with frontend implementation now
- **Stop here** — end the session so the user can clear the terminal and start fresh for the frontend phase

If the user chooses to stop, present a clear summary of what backend work was completed and which frontend phases remain, then halt. The user will resume by running `/implement_plan` again with the same plan path.

---

## Frontend E2E Testing with [this_project_frontend_playwright_tester_agent] (CONDITIONAL)

If the implementation includes frontend changes and an E2E testing guide was created in `thoughts/shared/e2e-test-guides/`, you MUST ask the user before invoking the `[this_project_frontend_playwright_tester_agent]` agent.

> **Project setup note**: Replace `[this_project_frontend_playwright_tester_agent]` throughout this section with the actual subagent type configured for this project's frontend Playwright testing (e.g. `angular-tester`).

### When to Use [this_project_frontend_playwright_tester_agent]

**Only consider it if ALL of the following are true:**
1. The plan included frontend modifications (components, templates, or UI logic)
2. An E2E testing guide exists in `thoughts/shared/e2e-test-guides/` with test scenarios
3. The guide includes testid attributes and user flows to test

**Skip if:**
- No frontend changes were made (backend-only changes)
- No E2E testing guide was created
- Only manual visual testing is required (no automated flows)

### Ask Before Running the Frontend Tester (MANDATORY)

Before invoking `[this_project_frontend_playwright_tester_agent]`, use `AskUserQuestion` with these options:
- **Run automated E2E tests** — invoke the frontend tester agent via Task tool (token-heavy, comprehensive)
- **Skip, I'll test manually** — skip the agent; the user will verify the frontend changes themselves

Only invoke the agent if the user explicitly chooses the automated option.

### How to Invoke [this_project_frontend_playwright_tester_agent]

After the user confirms they want automated testing:

1. **Invoke the agent as a Task**:
   ```
   Use the Task tool with:
   - subagent_type: "[this_project_frontend_playwright_tester_agent]"
   - description: "Execute frontend E2E tests"
   - prompt: "Execute the E2E test scenarios documented in thoughts/shared/e2e-test-guides/YYYY-MM-DD-ENG-XXXX-e2e-test-guide.md. Follow the Research-Plan-Execute workflow for each scenario and report the results."
   ```

2. **Wait for results**: The agent will execute all test scenarios and report PASS/FAIL status for each

3. **Handle test results**:
   - **If all tests PASS**: Proceed to mark implementation complete
   - **If any tests FAIL**: Debug the failures, fix the issues, and re-run the agent
   - Report any failures to the user with details from the agent's output

4. **Present final results**:
   ```
   Frontend E2E Testing Complete

   The frontend tester agent executed all E2E scenarios from the testing guide:
   - [Scenario 1]: PASS
   - [Scenario 2]: PASS
   - [Scenario 3]: FAIL - [brief description]

   [If failures exist, explain what needs to be fixed]
   ```

### Why Use Task Tool for Frontend Testing

**CRITICAL**: The frontend tester agent MUST be invoked via the Task tool (not directly) because:
- It has exclusive access to Playwright MCP tools (browser_navigate, browser_click, etc.)
- These tools are token-heavy and should not bloat the main implementation context
- Isolating them in a sub-agent keeps the main session efficient
- The agent operates in a specialized verification mode separate from implementation

**Never invoke Playwright tools directly** - always delegate to the frontend tester agent via Task tool.

## If You Get Stuck

When something isn't working as expected:
- First, make sure you've read and understood all the relevant code
- Consider if the codebase has evolved since the plan was written
- Present the mismatch clearly and ask for guidance

Use sub-tasks sparingly - mainly for targeted debugging or exploring unfamiliar territory.

## Resuming Work

If the plan has existing checkmarks:
- Trust that completed work is done
- Pick up from the first unchecked item
- Verify previous work only if something seems off

Remember: You're implementing a solution, not just checking boxes. Keep the end goal in mind and maintain forward momentum.
