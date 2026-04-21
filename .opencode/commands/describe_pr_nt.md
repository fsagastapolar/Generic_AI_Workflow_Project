---
description: Generate comprehensive PR descriptions following repository templates
agent: build
subtask: true
---

# Generate PR Description

You are tasked with generating a comprehensive pull request description following the repository's standard template.

## Prerequisites

Before using this command, ensure you have the correct GitHub CLI version:
- **Minimum Version**: 2.82.1 or higher
- **Must use**: GitHub's official repository (not Ubuntu universe)
- See `.claude/project_guidelines.md` → "GitHub CLI Requirements" for installation instructions

Verify your setup:
```bash
gh --version  # Should be >= 2.82.1
apt-cache policy gh | grep "cli.github.com"  # Should show GitHub's official repo
```

## DO NOT

- DO NOT run any kind of test. You'll assume all the proper testing was already done. You are NOT a tester
- DO NOT create any new file under NO circumstance

## Steps to follow:

1. **Identify branch and merge target:**
   - Get the current branch: `git branch --show-current`
   - Prune stale remote references and fetch: `git fetch --prune`
   - List active remote branches, excluding the current branch: `git branch -r | grep -v "origin/HEAD" | grep -v "origin/$(git branch --show-current)"`
   - Present the remaining branches as a numbered list for the user to choose from
   - Ask the user to select the base branch for the PR

2. **Read the PR description template:**

    - Use the following PR description template:

        ```md
        ## What problem(s) was I solving?

        ## What user-facing changes did I ship?

        ## How I implemented it

        ## How to verify it

        ### Manual Testing

        ## Description for the changelog
        ```

    - Read the template carefully to understand all sections and requirements
    - You can check the file thoughts/shared/templates/pr_description.md for a template

3. **Create the PR:**
   - Assume no PR exists yet for the current branch
   - Create a new PR targeting the selected base branch: `gh pr create --base {selected_branch} --title "{branch_name}" --body ""`
   - Note the PR number from the output for use in subsequent steps

4. **Check for existing description:**
   - Check if `/tmp/{repo_name}/prs/{number}_description.md` already exists
   - If it exists, read it and inform the user you'll be updating it
   - Consider what has changed since the last description was written

5. **Gather comprehensive PR information:**
   - Get the full PR diff: `gh pr diff {number}`
   - If you get an error about no default remote repository, instruct the user to run `gh repo set-default` and select the appropriate repository
   - Get commit history: `gh pr view {number} --json commits`
   - Review the base branch: `gh pr view {number} --json baseRefName`
   - Get PR metadata: `gh pr view {number} --json url,title,number,state`

6. **Analyze the changes thoroughly:** (ultrathink about the code changes, their architectural implications, and potential impacts)
   - Read through the entire diff carefully
   - For context, read any files that are referenced but not shown in the diff
   - Understand the purpose and impact of each change
   - Identify user-facing changes vs internal implementation details
   - Look for breaking changes or migration requirements

7. **Handle verification requirements:**
   - Look for any checklist items in the "How to verify it" section of the template
   - For each verification step:
     - If it's a command you can run (like `make check test`, `npm test`, etc.), run it
     - If it passes, mark the checkbox as checked: `- [x]`
     - If it fails, keep it unchecked and note what failed: `- [ ]` with explanation
     - If it requires manual testing (UI interactions, external services), leave unchecked and note for user
   - Document any verification steps you couldn't complete

8. **Generate the description:**
   - Fill out each section from the template thoroughly:
     - Answer each question/section based on your analysis
     - Be specific about problems solved and changes made
     - Focus on user impact where relevant
     - Include technical details in appropriate sections
     - Write a concise changelog entry
   - Ensure all checklist items are addressed (checked or explained)

9. **Save and sync the description:**
   - Write the completed description to `/tmp/{repo_name}/prs/{number}_description.md`
   - Show the user the generated description

10. **Update the PR:**
   - Update the PR description directly: `gh pr edit {number} --body-file /tmp/{repo_name}/prs/{number}_description.md`
   - Confirm the update was successful
   - If any verification steps remain unchecked, remind the user to complete them before merging

## Important notes:
- This command works across different repositories - always read the local template
- Be thorough but concise - descriptions should be scannable
- Focus on the "why" as much as the "what"
- Include any breaking changes or migration notes prominently
- If the PR touches multiple components, organize the description accordingly
- Always attempt to run verification commands when possible
- Clearly communicate which verification steps need manual testing
