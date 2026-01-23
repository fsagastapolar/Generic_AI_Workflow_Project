# PreClinic Project Guidelines

This document contains development guidelines, best practices, and mandatory workflows for all AI agents working on the PreClinic medical center management system.

## Project Context

PreClinic is a software solution for small hospitals and medical centers featuring:
- **Backend**: Laravel (PHP) running in Docker containers
- **Frontend**: Angular (TypeScript) running locally
- **Environment**: Professional medical setting with HIPAA awareness requirements

## Environment Constraints

### Backend (Laravel/PHP)
- **MUST** run inside Docker containers
- **NEVER** run Laravel/Eloquent operations locally
- Verify Docker service names from `docker-compose.yml` before running commands
- Example: `docker exec -it <service_name> php artisan migrate`

### Docker Service Names (from docker-compose.yml)
When running commands inside Docker containers, use these service names:
- **`app`**: Laravel application container (use for artisan commands, composer, etc.)
  - Example: `docker exec -it preclinic-app php artisan migrate`
  - Example: `docker exec -it preclinic-app composer install`
- **`mysql`**: MySQL database container
  - Example: `docker exec -it preclinic-mysql mysql -u preclinic_user -p`
- **`phpmyadmin`**: Database management interface (browser-based)

**Note**: Container names may have prefixes. Verify actual container names with: `docker ps`

### Frontend (Angular/TypeScript)
- Safe to run locally on the terminal
- No Docker required for frontend operations

### Scope Boundaries
- **DO NOT** create new repositories

## Database Requirements (MANDATORY)

### MySQL Only - Never SQLite
- **MUST** use MySQL as the database
- **NEVER** use SQLite for any purpose (development, testing, or production)
- **NEVER** create SQLite database files (.sqlite, .db, etc.)
- Database configuration is in `docker-compose.yml` and `.env`
- Connection settings:
  - Host: `mysql` (Docker service name)
  - Port: `3306`
  - Database: `preclinic`
  - User: `preclinic_user`
  - Password: `password` (development only)

### Why MySQL Only?
- The application is designed for MySQL-specific features
- SQLite lacks features required for medical data integrity
- Consistency between development and production environments

## Git Workflow (MANDATORY)

### Branching Strategy
**All changes MUST be performed on a new branch, always branching out from the `develop` branch.**

Never commit directly to `develop` or `main`.

## Technical Best Practices

### MySQL Database Constraints
- **Constraint Naming**: Use short, custom constraint names to stay under MySQL's 64-character limit
- Example: `$table->unique(['col1', 'col2'], 'short_name');` instead of letting Laravel auto-generate long names

### Migrations
- **We are in development**: We do not need to create new migrations when changes are introduced in the models, we can just drop the DB and re seed. After all the entire data we are using here comes from the seeder

### Eloquent Relationships
When modifying relationships:
- Update ALL related models
- Remove old relationship methods
- Add new relationship methods (e.g., `belongsToMany`)
- Update `$fillable` arrays accordingly


### Seeder Logic
- **Follow dependency order**: Entities first, then pivot tables/relationships
- **Include existence checks**: Prevent duplicate data on repeated seeding
- Example: Check if record exists before creating

### Tinker Verification
- Use simple database queries for verification
- Properly escape backslashes in class names: `App\\Models\\User`
- Example: `App\\Models\\User::find(1)`

## Testing Requirements (MANDATORY)

### 1. Test Creation
**Every feature or change MUST be accompanied by new or updated tests.**

This is non-negotiable.

### 2. Test Modification Guardrail
**Under NO circumstances should tests be modified to pass a change that introduces a bug or violates a pre-existing rule.**

Tests are the source of truth. If a test fails, fix the code, not the test.

### 3. Flawed Test Exception
**If a test itself has flawed logic** (e.g., checking deprecated fields, testing incorrect behavior):
- The agent MUST ask for permission to modify it
- Clearly explain the reason and the flaw
- Wait for explicit approval before proceeding

### 4. Testing Types Required
- **Unit tests**: For individual functions and methods
- **Integration tests**: For feature workflows
- **Edge case coverage**: Test boundary conditions and error paths

## Professional and Ethical Standards

### Medical Environment Awareness
- Be mindful of HIPAA (Health Insurance Portability and Accountability Act) requirements
- Handle patient data references with appropriate sensitivity
- Maintain professional tone and terminology

### Ethical Guardrails
- Do not generate or implement harmful, illegal, or unethical functionality
- Do not introduce biased logic or discriminatory behavior
- Maintain the professional and sensitive nature of medical software

## Reference for Agents

When implementing features or making changes:
1. ✅ Always branch from `develop`
2. ✅ Run backend commands in Docker
3. ✅ Create/update tests for all changes
4. ✅ Use proper MySQL constraint naming
5. ✅ Update all related Eloquent models when changing relationships
6. ✅ Never modify tests to hide bugs - fix the code instead

## Manual Testing Documentation (MANDATORY)

### When to Create
**After completing any implementation**, a manual testing guide MUST be created.

### Location
`thoughts/shared/testing/YYYY-MM-DD-ENG-XXXX-manual-test-guide.md`
- Format: `YYYY-MM-DD-ENG-XXXX-manual-test-guide.md` where:
  - YYYY-MM-DD is the completion date
  - ENG-XXXX is the ticket number (omit if no ticket)
  - Example: `2025-12-28-ENG-1234-manual-test-guide.md`

### Required Content
The manual testing guide must include:
1. **Changes Summary**: What was implemented
2. **Prerequisites**: Environment setup needed (Docker running, database seeded, etc.)
3. **Test Scenarios**: Step-by-step instructions for each feature/change
4. **Expected Results**: What should happen at each step
5. **Edge Cases**: Boundary conditions and error scenarios to test
6. **Rollback Steps**: How to undo changes if issues are found

### Template Format
```markdown
# Manual Testing Guide: [Feature Name]

## Implementation Summary
- [Brief description of changes]
- Linear Ticket: ENG-XXXX (if applicable)
- Implementation Date: YYYY-MM-DD

## Prerequisites
- [ ] Docker containers running: `docker ps`
- [ ] Database migrated: `docker exec -it preclinic-app php artisan migrate`
- [ ] Database seeded (if needed): `docker exec -it preclinic-app php artisan db:seed`
- [ ] Frontend running (if applicable): `ng serve`

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
