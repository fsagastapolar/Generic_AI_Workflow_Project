# Manual Testing Guide: Project Guidelines Enforcement

## Implementation Summary
- Enhanced project guidelines with explicit rules about Docker, MySQL, and manual testing
- Updated 17 agent/command files to reference and follow project guidelines
- Fixed `.env.example` to show MySQL as default (not SQLite)
- Added manual testing documentation requirement to implementation workflow
- Implementation Date: 2025-12-28

## Prerequisites
- [ ] Project files accessible: `.claude/` directory and `Pre-Clinic-Backend/` directory
- [ ] Text editor or IDE available to review files
- [ ] Command line access for verification commands

## Test Scenarios

### Scenario 1: Verify .env.example Correction
**Objective**: Confirm that `.env.example` no longer misleads agents to use SQLite

**Steps**:
1. Open `Pre-Clinic-Backend/.env.example`
2. Locate the database configuration section (around line 22-27)
3. Verify MySQL is uncommented and SQLite is removed

**Expected Results**:
- Line 22 shows: `DB_CONNECTION=mysql` (uncommented)
- Line 23 shows: `DB_HOST=mysql` (uncommented)
- Line 24 shows: `DB_PORT=3306` (uncommented)
- Line 25 shows: `DB_DATABASE=preclinic` (uncommented)
- Line 26 shows: `DB_USERNAME=preclinic_user` (uncommented)
- Line 27 shows: `DB_PASSWORD=password` (uncommented)
- No SQLite references are active

**Edge Cases**:
- [ ] All MySQL settings match docker-compose.yml values
- [ ] No commented-out SQLite configuration remains active

### Scenario 2: Verify Enhanced Project Guidelines
**Objective**: Confirm all new sections were added correctly to project_guidelines.md

**Steps**:
1. Open `.claude/project_guidelines.md`
2. Search for "Docker Service Names" section
3. Search for "MySQL Only - Never SQLite" section
4. Search for "Manual Testing Documentation (MANDATORY)" section
5. Review each section for completeness

**Expected Results**:
- Docker Service Names section lists: `app`, `mysql`, `phpmyadmin` with examples
- Database Requirements section explicitly states "NEVER use SQLite"
- Manual Testing Documentation section includes template format
- All sections have clear, unambiguous language

**Edge Cases**:
- [ ] Docker service names match docker-compose.yml
- [ ] Database reasoning explains medical data integrity
- [ ] Testing template is comprehensive and actionable

### Scenario 3: Verify Agent File Updates
**Objective**: Confirm all 17 files now reference project guidelines

**Steps**:
1. Run verification command in terminal:
   ```
   powershell -Command "(Get-ChildItem '.claude\commands\*.md', '.claude\agents\*.md' | Select-String -Pattern 'project_guidelines.md' -List | Measure-Object).Count"
   ```
2. Verify count is 17 (or 18 with any new files)
3. Spot-check 3-4 random files to review guidelines sections

**Expected Results**:
- Command returns count of 17 or more
- Planning commands have detailed "Project Guidelines (MANDATORY)" section
- Implementation commands reference Docker and MySQL requirements
- Git workflow commands mention branching from `develop`

**Edge Cases**:
- [ ] Open a planning command (e.g., `create_plan.md`) - should have comprehensive guidelines section
- [ ] Open an implementation command (e.g., `ralph_impl.md`) - should mention Docker containers
- [ ] Open a git command (e.g., `commit.md`) - should reference git workflow

### Scenario 4: Verify Manual Testing Documentation Requirement
**Objective**: Confirm `implement_plan.md` now requires manual testing guides

**Steps**:
1. Open `.claude/commands/implement_plan.md`
2. Search for "Manual Testing Documentation (MANDATORY)"
3. Review the instructions and template reference
4. Verify `thoughts/shared/testing/` directory exists

**Expected Results**:
- Section appears after line 76 (after verification instructions)
- Instructions include file naming convention with date and ticket number
- References template in project_guidelines.md
- Directory `thoughts/shared/testing/` exists

**Edge Cases**:
- [ ] Template reference points to correct section in guidelines
- [ ] Instructions are clear about when to create the guide
- [ ] Testing directory was created successfully

## Regression Testing
Test that existing functionality still works:
- [ ] Existing agent files still function correctly (no broken syntax)
- [ ] Project guidelines file is still valid markdown
- [ ] No files were accidentally modified beyond the planned changes

## Known Issues / Limitations
- None identified during implementation
- All automated verification checks passed

## Rollback Instructions
If critical issues are found:
1. **Revert `.env.example`**:
   - Change `DB_CONNECTION=mysql` back to `DB_CONNECTION=sqlite`
   - Comment out MySQL connection settings

2. **Revert `project_guidelines.md`**:
   - Remove "Docker Service Names" section
   - Remove "Database Requirements (MANDATORY)" section
   - Remove "Manual Testing Documentation (MANDATORY)" section

3. **Revert agent files** (17 files):
   - Remove "Project Guidelines" sections from all updated files
   - Use git to revert if changes were committed

4. **Revert `implement_plan.md`**:
   - Remove "Manual Testing Documentation (MANDATORY)" section

5. **Remove testing directory** (optional):
   - Delete `thoughts/shared/testing/` if no longer needed
