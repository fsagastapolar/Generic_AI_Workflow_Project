---
description: Generate comprehensive PR descriptions following repository templates
agent: build
subtask: true
---

You are tasked with generating a comprehensive pull request description following the repository's standard template.

## Prerequisites

Before using this command, ensure you have the correct GitHub CLI version:
- **Minimum Version**: 2.82.1 or higher
- See `AGENTS.md` for installation instructions if needed

## DO NOT

- DO NOT run any kind of test. You'll assume all proper testing was already done.
- DO NOT create any new file under NO circumstance

## Steps to follow:

1. **Identify branch and merge target:**
   - Get the current branch: `git branch --show-current`
   - Prune stale remote references and fetch: `git fetch --prune`
   - List active remote branches, excluding the current branch
   - Present the remaining branches as a numbered list for the user to choose from
   - Ask the user to select the base branch for the PR

2. **Read the PR description template:**
   Use the following PR description template:
   ```md
   ## What problem(s) was I solving?
   ## What user-facing changes did I ship?
   ## How I implemented it
   ## How to verify it
   ### Manual Testing
   ## Description for the changelog
   ```

3. **Create the PR:**
   - Assume no PR exists yet for the current branch
   - Create a new PR targeting the selected base branch: `gh pr create --base {selected_branch} --title "{branch_name}" --body ""`
   - Note the PR number

4. **Check for existing description:**
   - Check if `/tmp/{repo_name}/prs/{number}_description.md` already exists
   - If it exists, read it and inform the user you'll be updating it

5. **Gather comprehensive PR information:**
   - Get the full PR diff: `gh pr diff {number}`
   - Get commit history: `gh pr view {number} --json commits`
   - Get PR metadata: `gh pr view {number} --json url,title,number,state`

6. **Analyze the changes thoroughly:**
   - Read through the entire diff
   - Read any files referenced but not shown in the diff
   - Identify user-facing changes vs internal implementation details

7. **Generate the description:**
   - Fill out each section from the template
   - Be specific about problems solved and changes made
   - Include technical details in appropriate sections

8. **Save and sync:**
   - Write to `/tmp/{repo_name}/prs/{number}_description.md`
   - Show the user the generated description

9. **Update the PR:**
   - `gh pr edit {number} --body-file /tmp/{repo_name}/prs/{number}_description.md`

## Important notes:
- Be thorough but concise - descriptions should be scannable
- Focus on the "why" as much as the "what"
- Always attempt to run verification commands when possible
