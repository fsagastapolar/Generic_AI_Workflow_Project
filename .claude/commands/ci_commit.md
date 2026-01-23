---
description: Create git commits for session changes with clear, atomic messages
---

# Commit Changes

You are tasked with creating git commits for the changes made during this session.

## Project Guidelines Reference

This command follows the git workflow defined in `.claude/project_guidelines.md`:
- There are two repos on this project, one in the folder called Pre-Clinic-Backend, another in Pre-Clinic-frontend. If you are not sure which repo to check, ask the user which one of these two
- Always branch from `develop`
- Never commit directly to `develop` or `main`
- Create descriptive branch names
- Write clear commit messages

For complete project guidelines, see: `.claude/project_guidelines.md`

## Process:

1. **Think about what changed:**
   - Review the conversation history and understand what was accomplished
   - Run `git status` to see current changes
   - Run `git diff` to understand the modifications
   - Consider whether changes should be one commit or multiple logical commits

2. **Plan your commit(s):**
   - Identify which files belong together
   - Draft clear, descriptive commit messages
   - Use imperative mood in commit messages
   - Focus on why the changes were made, not just what

3. **Execute upon confirmation:**
   - Use `git add` with specific files (never use `-A` or `.`)
   - Never commit the `thoughts/` directory or anything inside it!
   - Never commit dummy files, test scripts, or other files which you created or which appear to have been created but which were not part of your changes or directly caused by them (e.g. generated code)
   - Create commits with your planned messages until all of your changes are committed with `git commit -m`

## Remember:
- You have the full context of what was done in this session
- Group related changes together
- Keep commits focused and atomic when possible
- The user trusts your judgment - they asked you to commit
- **IMPORTANT**: - never stop and ask for feedback from the user. 

## DO NOT:
- Create or initialize a new repo