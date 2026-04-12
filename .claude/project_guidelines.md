# [PROJECT_NAME] Project Guidelines

<!--
TEMPLATE INSTRUCTIONS:
1. Replace [PROJECT_NAME] with your actual project name
2. Fill in the Project Context section with your project details
3. Customize Environment Constraints for your tech stack
4. Update Database Requirements for your database choice
5. Review and adjust Git Workflow for your team's practices
6. Customize Technical Best Practices for your technology choices
7. Adjust Professional/Ethical Standards based on your domain
8. Remove this comment block after customization
-->

This document contains development guidelines, best practices, and mandatory workflows for all AI agents working on the [PROJECT_NAME] project.

## Project Context

<!-- Describe your project: purpose, tech stack, key features -->

[PROJECT_NAME] is a software solution featuring:
- **Backend**: [Technology/Framework] (e.g., Laravel PHP, Node.js Express, Django, etc.)
- **Frontend**: [Technology/Framework] (e.g., Angular, React, Vue, etc.)
- **Database**: [Database type] (e.g., MySQL, PostgreSQL, MongoDB, etc.)
- **Environment**: [Deployment context and special requirements]

## Environment Constraints

<!-- Specify how different parts of your application should run -->

### Backend
- **Execution Environment**: [Docker containers / Local machine / Cloud service]
- **MUST/NEVER rules**:
  - Example: MUST run inside Docker containers
  - Example: NEVER run database migrations without backup
- **Service names** (if using Docker Compose):
  - `[service-name-1]`: [Description and example usage]
  - `[service-name-2]`: [Description and example usage]

### Frontend
- **Execution Environment**: [Local / Docker / Other]
- **Requirements**: [Node version, package manager, build tools]

### Database
- **Type**: [MySQL / PostgreSQL / MongoDB / etc.]
- **Access method**: [Direct connection / Docker exec / Cloud console]
- **Connection details**:
  - Host: [hostname or Docker service name]
  - Port: [port number]
  - Database: [database name]
  - User: [username]
  - Password: [reference to where password is stored]

### Scope Boundaries
<!-- Define what agents should NOT do -->
- **DO NOT** [action to avoid]
- **DO NOT** [another action to avoid]

## Database Requirements (MANDATORY)

<!-- Choose one database and be explicit about restrictions -->

### [Your Database Choice] Only
- **MUST** use [Database Type] as the database
- **NEVER** use [Alternative Database] for any purpose
- **NEVER** create [unwanted file types] (e.g., .sqlite, .db files)
- Database configuration location: [config file paths]

### Why [Your Database] Only?
- [Reason 1: e.g., production consistency]
- [Reason 2: e.g., specific features required]
- [Reason 3: e.g., team expertise]

## Git Workflow (MANDATORY)

### Branching Strategy
<!-- Define your branching model clearly -->

**Main branches:**
- `main`: [Purpose and protection rules]
- `develop`: [Purpose and when to use]
- `staging`: [If applicable]

**Branch naming convention:**
- Feature branches: `feature/[ticket-id]-description`
- Bug fixes: `bugfix/[ticket-id]-description`
- Hotfixes: `hotfix/[ticket-id]-description`

**Rules:**
- **MUST** branch from: [branch name]
- **NEVER** commit directly to: [protected branches]
- **MUST** create PR for: [when PRs are required]

### Commit Message Format
<!-- Define commit message conventions -->
```
[type]([scope]): [subject]

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Required Tools and Versions

<!-- List critical tool versions and installation requirements -->

### [Tool Name 1]
- **Minimum Version**: [version number]
- **Installation Source**: [preferred source/repository]
- **Why**: [reason for version requirement]

### [Tool Name 2]
- **Minimum Version**: [version number]
- **Configuration**: [any special setup needed]

## Technical Best Practices

<!-- Customize this section for your technology stack -->

### [Framework/Technology] Specific Practices

#### [Topic 1]
- [Guideline or rule]
- [Example or reasoning]

#### [Topic 2]
- [Guideline or rule]
- [Example or reasoning]

### Database Practices
- **Migrations**: [How to handle database changes]
- **Seeders**: [How to manage seed data]
- **Constraints**: [Naming conventions, limits, etc.]

### Code Organization
- **File structure**: [Expected organization]
- **Naming conventions**: [Files, classes, functions]
- **Module boundaries**: [How code should be separated]

### API Design
<!-- If applicable -->
- **Versioning**: [How APIs are versioned]
- **Authentication**: [Auth strategy]
- **Response format**: [JSON structure, error handling]

## Testing Requirements (MANDATORY)

### 1. Test Creation
**Every feature or change MUST be accompanied by new or updated tests.**

This is non-negotiable.

### 2. Test Modification Guardrail
**Under NO circumstances should tests be modified to pass a change that introduces a bug or violates a pre-existing rule.**

Tests are the source of truth. If a test fails, fix the code, not the test.

### 3. Flawed Test Exception
**If a test itself has flawed logic**:
- The agent MUST ask for permission to modify it
- Clearly explain the reason and the flaw
- Wait for explicit approval before proceeding

### 4. Testing Types Required
- **Unit tests**: [Location, framework, coverage requirements]
- **Integration tests**: [Scope and requirements]
- **E2E tests**: [When required, tools used]
- **Performance tests**: [If applicable]

### 5. Test Coverage Requirements
- Minimum coverage: [percentage]
- Critical paths: [100% coverage required for specific areas]

## Professional and Ethical Standards

<!-- Customize based on your domain and requirements -->

### Domain-Specific Considerations
<!-- Examples: HIPAA for healthcare, GDPR for EU users, SOC2 for enterprise -->
- [Regulation or standard 1]
- [Regulation or standard 2]
- [Sensitivity requirements]

### Ethical Guardrails
- Do not generate or implement harmful, illegal, or unethical functionality
- Do not introduce biased logic or discriminatory behavior
- [Other domain-specific ethical considerations]

### Security Practices
- [Authentication/authorization requirements]
- [Data encryption requirements]
- [Secret management practices]
- [Vulnerability reporting process]

## Reference Checklist for Agents

When implementing features or making changes:
1. ✅ [Key requirement 1, e.g., "Always branch from develop"]
2. ✅ [Key requirement 2, e.g., "Run backend commands in Docker"]
3. ✅ [Key requirement 3, e.g., "Create/update tests for all changes"]
4. ✅ [Key requirement 4]
5. ✅ [Key requirement 5]
6. ✅ [Add more based on your critical requirements]

## Manual Testing Documentation (MANDATORY)

### Testing Guide Strategy

After completing any implementation, create appropriate testing guides based on what was changed:

#### 1. API/Backend Changes: E2E API Test Guide

**When to Create**: Any implementation that adds or modifies API endpoints, backend logic, or database structure.

**How to Create**: Use the `e2e-test-guide-creator` agent (invoked as a Task during implementation):
- The agent will research the codebase, locate database seeders, analyze endpoints, and generate comprehensive API test guides
- It produces ready-to-run curl commands, seeded data IDs, SQL queries, and relevant commands
- This maximizes QA tester efficiency by eliminating manual lookup work

**Location**: `thoughts/shared/e2e-test-guides/YYYY-MM-DD-[feature]-api-test-guide.md`

**Agent-Generated Content Includes**:
- Complete curl commands with headers and JSON bodies
- Seeded user/entity IDs from database seeders
- Authentication token retrieval steps with full API calls
- Database verification queries
- Entity creation steps when seeded data insufficient
- Edge case testing (validation errors, authorization failures)
- Environment-specific commands for backend/database operations

**Example Structure**:
```markdown
# E2E API Test Guide: [Feature Name]

## Prerequisites
- [ ] [Environment setup step 1]
- [ ] [Environment setup step 2]
- [ ] [Database seeded]

## Authentication Setup
```bash
# Example curl command for authentication
```

**Seeded Users**: [List of seeded test users/entities]

## Test Scenarios

### Scenario 1: [Test Case Name]
```bash
# Example API call
```

**Expected Response**:
```json
{
  "expected": "response"
}
```

**Verify in Database**:
```bash
# Database verification command
```
```

#### 2. Frontend Changes: Frontend E2E Test Guide

**When to Create**: Any implementation that adds or modifies UI components, user flows, or frontend behavior.

**How to Create**: Manually document test scenarios for the `angular-tester` agent (or equivalent E2E testing agent).

**Location**: `thoughts/shared/e2e-test-guides/YYYY-MM-DD-[feature]-frontend-test-guide.md`

**Required Content**:
- User flows and test scenarios
- `data-testid` attributes for test selection (highest priority selector)
- Setup prerequisites (URLs, test data, credentials)
- Expected outcomes and verification points
- Research-Plan-Execute workflow structure

#### 3. General/Full-Stack Features: Manual Test Guide

**When to Create**: For features requiring manual verification, complex workflows, or visual testing that spans multiple layers.

**Location**: `thoughts/shared/testing/YYYY-MM-DD-[ticket-id]-manual-test-guide.md`

**Required Content**:
1. **Changes Summary**: What was implemented
2. **Prerequisites**: Environment setup needed
3. **Test Scenarios**: Step-by-step instructions for each feature/change
4. **Expected Results**: What should happen at each step
5. **Edge Cases**: Boundary conditions and error scenarios to test
6. **Rollback Steps**: How to undo changes if issues are found

### Template Format
```markdown
# Manual Testing Guide: [Feature Name]

## Implementation Summary
- [Brief description of changes]
- Ticket: [TICKET-ID] (if applicable)
- Implementation Date: YYYY-MM-DD

## Prerequisites
- [ ] [Setup requirement 1]
- [ ] [Setup requirement 2]
- [ ] [Database/environment ready]

## Test Scenarios

### Scenario 1: [Primary Feature Test]
**Objective**: Verify [main functionality]

**Steps**:
1. [Specific action]
2. [Next action]
3. [Verification step]

**Expected Results**:
- [What should happen]
- [What should be visible/changed]

**Edge Cases**:
- [ ] Test with empty input
- [ ] Test with maximum length input
- [ ] Test with special characters
- [ ] Test permissions/authorization

### Scenario 2: [Additional Test]
[Same format as Scenario 1]

## Regression Testing
Test that existing functionality still works:
- [ ] [Related feature 1 still works]
- [ ] [Related feature 2 still works]

## Known Issues / Limitations
- [Any known issues or future improvements]

## Rollback Instructions
If critical issues are found:
1. [Steps to undo changes]
2. [Database rollback if needed]
```

## Project-Specific Patterns

<!-- Document recurring patterns unique to your project -->

### [Pattern Type 1]
- **When to use**: [Conditions]
- **Implementation**: [How to implement]
- **Example**: [Code or reference]

### [Pattern Type 2]
- **When to use**: [Conditions]
- **Implementation**: [How to implement]
- **Example**: [Code or reference]

## Troubleshooting Common Issues

<!-- Document known issues and solutions -->

### Issue: [Common Problem]
**Symptoms**: [What it looks like]
**Cause**: [Why it happens]
**Solution**: [How to fix]

### Issue: [Another Problem]
**Symptoms**: [What it looks like]
**Cause**: [Why it happens]
**Solution**: [How to fix]

---

## Template Customization Checklist

Before using this template, ensure you have:
- [ ] Replaced all [PLACEHOLDERS] with actual values
- [ ] Removed project-specific examples (if any remain)
- [ ] Added your project's tech stack details
- [ ] Defined your git workflow and branching strategy
- [ ] Specified database and environment requirements
- [ ] Listed required tools and versions
- [ ] Added domain-specific guidelines (security, compliance, etc.)
- [ ] Removed this checklist section
- [ ] Removed the template instructions comment at the top
