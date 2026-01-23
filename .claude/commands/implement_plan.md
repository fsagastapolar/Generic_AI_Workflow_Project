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

After completing ALL phases and ALL automated verification passes, you MUST create a manual testing guide before marking the implementation as complete.

### Create Testing Guide

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

**IMPORTANT**: Do not mark the implementation as fully complete until the manual testing guide is created and presented to the user.

## Frontend E2E Testing with angular-tester (CONDITIONAL)

If the implementation includes frontend changes and an E2E testing guide was created in `thoughts/shared/e2e-test-guides/`, you MUST invoke the `angular-tester` agent to execute the automated E2E tests.

### When to Use angular-tester

**Only invoke angular-tester if ALL of the following are true:**
1. The plan included frontend modifications (Angular components, templates, or UI logic)
2. An E2E testing guide exists in `thoughts/shared/e2e-test-guides/` with test scenarios
3. The guide includes `data-testid` attributes and user flows to test

**Skip angular-tester if:**
- No frontend changes were made (backend-only changes)
- No E2E testing guide was created
- Only manual visual testing is required (no automated flows)

### How to Invoke angular-tester

After creating the manual testing guide and IF frontend E2E testing is needed:

1. **Invoke the angular-tester agent as a Task**:
   ```
   Use the Task tool with:
   - subagent_type: "angular-tester"
   - description: "Execute frontend E2E tests"
   - prompt: "Execute the E2E test scenarios documented in thoughts/shared/e2e-test-guides/YYYY-MM-DD-ENG-XXXX-e2e-test-guide.md. Follow the Research-Plan-Execute workflow for each scenario and report the results."
   ```

2. **Wait for angular-tester results**: The agent will execute all test scenarios and report PASS/FAIL status for each

3. **Handle test results**:
   - **If all tests PASS**: Proceed to mark implementation complete
   - **If any tests FAIL**: Debug the failures, fix the issues, and re-run angular-tester
   - Report any failures to the user with details from the agent's output

4. **Present final results**:
   ```
   Frontend E2E Testing Complete

   The angular-tester agent executed all E2E scenarios from the testing guide:
   - [Scenario 1]: PASS
   - [Scenario 2]: PASS
   - [Scenario 3]: FAIL - [brief description]

   [If failures exist, explain what needs to be fixed]
   ```

### Why Use Task Tool for angular-tester

**CRITICAL**: The angular-tester agent MUST be invoked via the Task tool (not directly) because:
- It has exclusive access to Playwright MCP tools (browser_navigate, browser_click, etc.)
- These tools are token-heavy and should not bloat the main implementation context
- Isolating them in a sub-agent keeps the main session efficient
- The agent operates in a specialized verification mode separate from implementation

**Never invoke Playwright tools directly** - always delegate to angular-tester via Task tool.

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
