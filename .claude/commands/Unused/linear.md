---
description: Manage Linear tickets - create, update, comment, and follow workflow patterns
---

# Linear - Ticket Management

You are tasked with managing Linear tickets, including creating tickets from thoughts documents, updating existing tickets, and following the team's specific workflow patterns.

## Initial Setup

First, verify that Linear MCP tools are available by checking if any `mcp__linear__` tools exist. If not, respond:
```
I need access to Linear tools to help with ticket management. Please run the `/mcp` command to enable the Linear MCP server, then try again.
```

If tools are available, respond based on the user's request:

### For general requests:
```
I can help you with Linear tickets. What would you like to do?
1. Create a new ticket from a thoughts document
2. Add a comment to a ticket (I'll use our conversation context)
3. Search for tickets
4. Update ticket status or details
```

### For specific create requests:
```
I'll help you create a Linear ticket from your thoughts document. Please provide:
1. The path to the thoughts document (or topic to search for)
2. Any specific focus or angle for the ticket (optional)
```

Then wait for the user's input.

## Team Workflow & Status Progression (CUSTOMIZE THIS)

**IMPORTANT:** Update this section to match your team's actual workflow.

Example workflow (customize based on your Linear workspace):

1. **Backlog** → Tickets waiting to be prioritized
2. **Todo** → Ready to be worked on
3. **In Progress** → Active development
4. **In Review** → PR submitted for review
5. **Done** → Completed

Update the status progression logic in the "Updating Ticket Status" section below to match your workflow.

## Important Conventions

### URL Mapping for Documents (CUSTOMIZE THIS)
When referencing documentation, always provide GitHub links using the `links` parameter:
- `docs/...` → `https://github.com/YOUR_ORG/YOUR_REPO/blob/main/docs/...`
- Customize these mappings based on your documentation structure

### Default Values (CUSTOMIZE THESE)
- **Status**: Always create new tickets in "Triage" status (update the state ID below)
- **Project**: For new tickets, ask the user which project or use your default project
  - To find your project ID, use: `mcp__linear__list_projects`
- **Priority**: Default to Medium (3) for most tasks, use best judgment or ask user
  - Urgent (1): Critical blockers, security issues
  - High (2): Important features with deadlines, major bugs
  - Medium (3): Standard implementation tasks (default)
  - Low (4): Nice-to-haves, minor improvements
- **Links**: Use the `links` parameter to attach URLs (not just markdown links in description)

### Automatic Label Assignment (CUSTOMIZE THIS)
Automatically apply labels based on the ticket content:
- Customize these based on your project's components/areas
- Example: **frontend**, **backend**, **infrastructure**, **docs**, etc.
- To find your label IDs, use: `mcp__linear__list_labels`

## Action-Specific Instructions

### 1. Creating Tickets from Thoughts

#### Steps to follow after receiving the request:

1. **Locate and read the thoughts document:**
   - If given a path, read the document directly
   - If given a topic/keyword, search thoughts/ directory using Grep to find relevant documents
   - If multiple matches found, show list and ask user to select
   - Create a TodoWrite list to track: Read document → Analyze content → Draft ticket → Get user input → Create ticket

2. **Analyze the document content:**
   - Identify the core problem or feature being discussed
   - Extract key implementation details or technical decisions
   - Note any specific code files or areas mentioned
   - Look for action items or next steps
   - Identify what stage the idea is at (early ideation vs ready to implement)
   - Take time to ultrathink about distilling the essence of this document into a clear problem statement and solution approach

3. **Check for related context (if mentioned in doc):**
   - If the document references specific code files, read relevant sections
   - If it mentions other thoughts documents, quickly check them
   - Look for any existing Linear tickets mentioned

4. **Get Linear workspace context:**
   - List teams: `mcp__linear__list_teams`
   - If multiple teams, ask user to select one
   - List projects for selected team: `mcp__linear__list_projects`

5. **Draft the ticket summary:**
   Present a draft to the user:
   ```
   ## Draft Linear Ticket

   **Title**: [Clear, action-oriented title]

   **Description**:
   [2-3 sentence summary of the problem/goal]

   ## Key Details
   - [Bullet points of important details from thoughts]
   - [Technical decisions or constraints]
   - [Any specific requirements]

   ## Implementation Notes (if applicable)
   [Any specific technical approach or steps outlined]

   ## References
   - Source: `thoughts/[path/to/document.md]` ([View on GitHub](converted GitHub URL))
   - Related code: [any file:line references]
   - Parent ticket: [if applicable]

   ---
   Based on the document, this seems to be at the stage of: [ideation/planning/ready to implement]
   ```

6. **Interactive refinement:**
   Ask the user:
   - Does this summary capture the ticket accurately?
   - Which project should this go in? [show list]
   - What priority? (Default: Medium/3)
   - Any additional context to add?
   - Should we include more/less implementation detail?
   - Do you want to assign it to yourself?

   Note: Ticket will be created in "Triage" status by default.

7. **Create the Linear ticket:**
   ```
   mcp__linear__create_issue with:
   - title: [refined title]
   - description: [final description in markdown]
   - teamId: [selected team]
   - projectId: [use default project from above unless user specifies]
   - priority: [selected priority number, default 3]
   - stateId: [Triage status ID]
   - assigneeId: [if requested]
   - labelIds: [apply automatic label assignment from above]
   - links: [{url: "GitHub URL", title: "Document Title"}]
   ```

8. **Post-creation actions:**
   - Show the created ticket URL
   - Ask if user wants to:
     - Add a comment with additional implementation details
     - Create sub-tasks for specific action items
     - Update the original thoughts document with the ticket reference
   - If yes to updating thoughts doc:
     ```
     Add at the top of the document:
     ---
     linear_ticket: [URL]
     created: [date]
     ---
     ```

## Example transformations:

### From verbose thoughts:
```
"I've been thinking about how our resumed sessions don't inherit permissions properly.
This is causing issues where users have to re-specify everything. We should probably
store all the config in the database and then pull it when resuming. Maybe we need
new columns for permission_prompt_tool and allowed_tools..."
```

### To concise ticket:
```
Title: Fix resumed sessions to inherit all configuration from parent

Description:

## Problem to solve
Currently, resumed sessions only inherit Model and WorkingDir from parent sessions,
causing all other configuration to be lost. Users must re-specify permissions and
settings when resuming.

## Solution
Store all session configuration in the database and automatically inherit it when
resuming sessions, with support for explicit overrides.
```

### 2. Adding Comments and Links to Existing Tickets

When user wants to add a comment to a ticket:

1. **Determine which ticket:**
   - Use context from the current conversation to identify the relevant ticket
   - If uncertain, use `mcp__linear__get_issue` to show ticket details and confirm with user
   - Look for ticket references in recent work discussed

2. **Format comments for clarity:**
   - Attempt to keep comments concise (~10 lines) unless more detail is needed
   - Focus on the key insight or most useful information for a human reader
   - Not just what was done, but what matters about it
   - Include relevant file references with backticks and GitHub links

3. **File reference formatting:**
   - Wrap paths in backticks: `thoughts/allison/example.md`
   - Add GitHub link after: `([View](url))`
   - Do this for both thoughts/ and code files mentioned

4. **Comment structure example:**
   ```markdown
   Implemented retry logic in webhook handler to address rate limit issues.

   Key insight: The 429 responses were clustered during batch operations,
   so exponential backoff alone wasn't sufficient - added request queuing.

   Files updated:
   - `hld/webhooks/handler.go` ([GitHub](link))
   - `thoughts/shared/rate_limit_analysis.md` ([GitHub](link))
   ```

5. **Handle links properly:**
   - If adding a link with a comment: Update the issue with the link AND mention it in the comment
   - If only adding a link: Still create a comment noting what link was added for posterity
   - Always add links to the issue itself using the `links` parameter

6. **For comments with links:**
   ```
   # First, update the issue with the link
   mcp__linear__update_issue with:
   - id: [ticket ID]
   - links: [existing links + new link with proper title]

   # Then, create the comment mentioning the link
   mcp__linear__create_comment with:
   - issueId: [ticket ID]
   - body: [formatted comment with key insights and file references]
   ```

7. **For links only:**
   ```
   # Update the issue with the link
   mcp__linear__update_issue with:
   - id: [ticket ID]
   - links: [existing links + new link with proper title]

   # Add a brief comment for posterity
   mcp__linear__create_comment with:
   - issueId: [ticket ID]
   - body: "Added link: `path/to/document.md` ([View](url))"
   ```

### 3. Searching for Tickets

When user wants to find tickets:

1. **Gather search criteria:**
   - Query text
   - Team/Project filters
   - Status filters
   - Date ranges (createdAt, updatedAt)

2. **Execute search:**
   ```
   mcp__linear__list_issues with:
   - query: [search text]
   - teamId: [if specified]
   - projectId: [if specified]
   - stateId: [if filtering by status]
   - limit: 20
   ```

3. **Present results:**
   - Show ticket ID, title, status, assignee
   - Group by project if multiple projects
   - Include direct links to Linear

### 4. Updating Ticket Status

When moving tickets through the workflow:

1. **Get current status:**
   - Fetch ticket details
   - Show current status in workflow

2. **Suggest next status:**
   - Triage → Spec Needed (lacks detail/problem statement)
   - Spec Needed → Research Needed (once problem/solution outlined)
   - Research Needed → Research in Progress (starting research)
   - Research in Progress → Research in Review (optional, can skip to Ready for Plan)
   - Research in Review → Ready for Plan (research approved)
   - Ready for Plan → Plan in Progress (starting to write plan)
   - Plan in Progress → Plan in Review (plan written)
   - Plan in Review → Ready for Dev (plan approved)
   - Ready for Dev → In Dev (work started)

3. **Update with context:**
   ```
   mcp__linear__update_issue with:
   - id: [ticket ID]
   - stateId: [new status ID]
   ```

   Consider adding a comment explaining the status change.

## Important Notes

- Tag users in descriptions and comments using `@[name](ID)` format, e.g., `@[dex](16765c85-2286-4c0f-ab49-0d4d79222ef5)`
- Keep tickets concise but complete - aim for scannable content
- All tickets should include a clear "problem to solve" - if the user asks for a ticket and only gives implementation details, you MUST ask "To write a good ticket, please explain the problem you're trying to solve from a user perspective"
- Focus on the "what" and "why", include "how" only if well-defined
- Always preserve links to source material using the `links` parameter
- Don't create tickets from early-stage brainstorming unless requested
- Use proper Linear markdown formatting
- Include code references as: `path/to/file.ext:linenum`
- Ask for clarification rather than guessing project/status
- Remember that Linear descriptions support full markdown including code blocks
- Always use the `links` parameter for external URLs (not just markdown links)
- remember - you must get a "Problem to solve"!

## Comment Quality Guidelines

When creating comments, focus on extracting the **most valuable information** for a human reader:

- **Key insights over summaries**: What's the "aha" moment or critical understanding?
- **Decisions and tradeoffs**: What approach was chosen and what it enables/prevents
- **Blockers resolved**: What was preventing progress and how it was addressed
- **State changes**: What's different now and what it means for next steps
- **Surprises or discoveries**: Unexpected findings that affect the work

Avoid:
- Mechanical lists of changes without context
- Restating what's obvious from code diffs
- Generic summaries that don't add value

Remember: The goal is to help a future reader (including yourself) quickly understand what matters about this update.

## CUSTOMIZE: Your Linear Workspace IDs

**IMPORTANT:** Replace all IDs below with your own workspace IDs.

To get your IDs, use these MCP tools in Claude Code:
- `mcp__linear__list_teams` - Get your team IDs
- `mcp__linear__list_projects` - Get your project IDs
- `mcp__linear__list_workflow_states` - Get your workflow state IDs
- `mcp__linear__list_labels` - Get your label IDs
- `mcp__linear__list_users` - Get your user IDs

### Your Team
- **Team ID**: `9273ffd0-24c3-49c9-8e2b-4462df9f54d4`

### Your Labels (customize based on your project)
- **bug**: `YOUR_BUG_LABEL_ID`
- **feature**: `YOUR_FEATURE_LABEL_ID`
- **enhancement**: `YOUR_ENHANCEMENT_LABEL_ID`
- Add more labels as needed...

### Your Workflow State IDs
Update these to match YOUR Linear workspace workflow:

- **Backlog**: `YOUR_BACKLOG_STATE_ID` (type: backlog)
- **Todo**: `YOUR_TODO_STATE_ID` (type: unstarted)
- **In Progress**: `YOUR_IN_PROGRESS_STATE_ID` (type: started)
- **In Review**: `YOUR_IN_REVIEW_STATE_ID` (type: started)
- **Done**: `YOUR_DONE_STATE_ID` (type: completed)
- **Canceled**: `YOUR_CANCELED_STATE_ID` (type: canceled)

Add any custom workflow states you use...

### Your Linear User IDs
- your_name: YOUR_USER_ID_HERE
- teammate1: TEAMMATE1_ID_HERE
- teammate2: TEAMMATE2_ID_HERE
