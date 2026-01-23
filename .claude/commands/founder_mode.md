---
description: Create Linear ticket and PR for experimental features after implementation
---

## Project Guidelines (MANDATORY)

Before implementing any changes, read and follow the project guidelines at `.claude/project_guidelines.md`. These guidelines cover:
- **Git Workflow**: Branch from `develop`, create PRs for review
- **Docker Environment**: Run all backend operations in Docker containers
  - Laravel/PHP: `docker exec -it preclinic-app <command>`
  - MySQL: `docker exec -it preclinic-mysql <command>`
- **Database**: MySQL ONLY, NEVER SQLite or other databases
- **Testing**: Create/update tests for all changes, never modify tests to hide bugs
- **Manual Testing**: Create testing guide at `thoughts/shared/testing/YYYY-MM-DD-manual-test-guide.md`

**You MUST adhere to these guidelines throughout implementation.**

you're working on an experimental feature that didn't get the proper ticketing and pr stuff set up.

assuming you just made a commit, here are the next steps:


1. get the sha of the commit you just made (if you didn't make one, read `.claude/commands/commit.md` and make one)

2. read `.claude/commands/linear.md` - think deeply about what you just implemented, then create a linear ticket about what you just did, and put it in 'in dev' state - it should have ### headers for "problem to solve" and "proposed solution"
3. fetch the ticket to get the recommended git branch name
4. git checkout main
5. git checkout -b 'BRANCHNAME'
6. git cherry-pick 'COMMITHASH'
7. git push -u origin 'BRANCHNAME'
8. gh pr create --fill
9. read '.claude/commands/describe_pr.md' and follow the instructions
