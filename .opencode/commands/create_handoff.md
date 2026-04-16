---
description: Create handoff document for transferring work to another session
agent: build
subtask: true
---

You are tasked with writing a handoff document to hand off your work to another agent in a new session. You will create a handoff document that is thorough, but also **concise**. The goal is to compact and summarize your context without losing any of the key details of what you're working on.

## Process

### 1. Filepath & Metadata
Use the following information to understand how to create your document:
    - create your file under `thoughts/shared/handoffs/ENG-XXXX/YYYY-MM-DD_HH-MM-SS_ENG-ZZZZ_description.md`, where:
        - YYYY-MM-DD is today's date
        - HH-MM-SS is the hours, minutes and seconds based on the current time, in 24-hour format
        - ENG-XXXX is the ticket number (replace with `general` if no ticket)
        - ENG-ZZZZ is the ticket number (omit if no ticket)
        - description is a brief kebab-case description
    - Run the `scripts/spec_metadata.sh` script to generate all relevant metadata
    - Examples:
        - With ticket: `2025-01-08_13-55-22_ENG-2166_create-context-compaction.md`
        - Without ticket: `2025-01-08_13-55-22_create-context-compaction.md`

### 2. Handoff writing.
using the above conventions, write your document. use the defined filepath, and the following YAML frontmatter pattern:

```markdown
---
date: [Current date and time with timezone in ISO format]
researcher: [Researcher name from thoughts status]
git_commit: [Current commit hash]
branch: [Current branch name]
repository: [Repository name]
topic: "[Feature/Task Name] Implementation Strategy"
tags: [implementation, strategy, relevant-component-names]
status: complete
last_updated: [Current date in YYYY-MM-DD format]
last_updated_by: [Researcher name]
type: implementation_strategy
plan_path: [Path to the plan being implemented — omit if no plan]
---

# Handoff: ENG-XXXX {very concise description}

## Task(s)
{description of the task(s) that you were working on, along with the status of each. If working on an implementation plan, call out which phase you are on. Reference plan/research documents.}

## Critical References
{List 2-3 most important file paths. Leave blank if none.}

## Recent changes
{describe recent changes made to the codebase in line:file syntax}

## Learnings
{important things learned — patterns, root causes, file paths.}

## Artifacts
{exhaustive list of artifacts produced or updated as filepaths}

## Action Items & Next Steps
{list of action items and next steps for the next agent}

## Other Notes
{other notes, references, or useful information}
```

### 3. Complete
Once the document is written, respond to the user:

Handoff created and synced! You can resume from this handoff in a new session with the following command:

```
/resume_handoff thoughts/shared/handoffs/[path-to-handoff].md
```

## Additional Notes
- **more information, not less**. This guideline defines the minimum.
- **be thorough and precise**. Include both top-level objectives and lower-level details.
- **avoid excessive code snippets**. Prefer `/path/to/file.ext:line` references over large code blocks.
