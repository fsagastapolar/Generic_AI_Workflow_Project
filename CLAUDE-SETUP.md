# Project Setup Guide

## Overview

This project uses Claude AI with Model Context Protocol (MCP) configurations. To prevent security breaches and avoid accidentally exposing API keys or sensitive configurations to GitHub, we maintain example configuration files that need to be customized for your local environment.

## Security Notice

⚠️ **Important**: Never commit files containing API keys, tokens, or other sensitive credentials to version control.

The following files are excluded from Git via `.gitignore`:
- `.claude/mcp_config.json`
- `.claude/mcp_config_merged.json`
- `.claude/settings.local.json`
- `.env`
- `.env.local`

## Initial Setup

### 1. Install Dependencies

First, install the project dependencies including MCP servers:

```bash
# Install all dependencies (including MCP servers)
npm install
```

**Important**: MCP servers are installed **locally** (in `node_modules/`) rather than globally. This approach:
- Avoids conflicts with other projects
- Ensures version consistency across team members
- Makes the setup reproducible and isolated
- Prevents permission issues with global installations

### 2. Install MCP Servers Locally

If you need to add additional MCP servers, always install them as project dependencies:

```bash
# Install MCP servers as dev dependencies (local to project)
npm install --save-dev @playwright/mcp
# Add other MCP servers as needed
```

**Never install MCP servers globally** (avoid `npm install -g`). This ensures all team members use the same versions and configurations.

**Note**: Linear integration uses direct GraphQL API calls via `curl` (no MCP server needed). See `.env.example` for required `LINEAR_API_KEY`.

### 3. Claude Configuration Files

Navigate to the `.claude/` directory and create your local configuration files from the provided examples:

```bash
cd .claude/

# Copy MCP configuration files
cp mcp_config.json.example mcp_config.json
cp mcp_config_merged.json.example mcp_config_merged.json

# If you need local settings overrides
cp settings.json settings.local.json
```

### 4. Configure MCP Settings

Edit the copied configuration files to add your specific settings:

#### `mcp_config.json`
This file contains your MCP server configurations. Update it with:
- Server endpoints
- API keys or authentication tokens
- Custom server settings

#### `mcp_config_merged.json`
This file contains merged MCP configurations. Update it with:
- Combined server configurations
- Shared settings across multiple MCP servers

#### `settings.local.json` (Optional)
Use this file for local overrides of settings without modifying the committed `settings.json`.

### 5. Environment Variables

Create your local `.env` file:

```bash
# In project root
cp .env.example .env
```

Edit `.env` with your actual values. Required for Linear integration:

- **`LINEAR_API_KEY`** — Generate at https://linear.app/settings/api
- **`LINEAR_TEAM_ID`** — Your team's UUID (find via API, see `.env.example`)
- **`LINEAR_PROJECT_ID`** (optional) — Default project for new tickets

Without these, all commands work normally but without Linear ticket tracking.

## Configuration File Structure

### Example `.claude/mcp_config.json`

When configuring MCP servers, always reference the **local installation** in `node_modules/`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": [
        "node_modules/@playwright/mcp/dist/index.js"
      ]
    }
  }
}
```

**Key Points**:
- Use `"command": "node"` to run locally installed servers
- Path should point to `node_modules/@package-name/...`
- Add environment variables in the `"env"` object for servers that require API keys

## Verification

After setup, verify your configuration:

1. Ensure all `.example` files have corresponding local versions without `.example` extension
2. Check that your API keys and sensitive data are only in the local files
3. Confirm these local files appear in `.gitignore`
4. Verify MCP servers are installed locally:
   ```bash
   # Check if MCP servers are in node_modules
   ls node_modules/@playwright/mcp
   ```
5. Test that Git doesn't track your configuration files:
   ```bash
   git status
   ```
   Your `.claude/*.json` (non-example) files should not appear as untracked

### Testing MCP Server Configuration

To verify MCP servers are working correctly:

1. **Check server paths**: Ensure paths in your `mcp_config.json` point to existing files:
   ```bash
   # Verify server files exist
   test -f node_modules/@playwright/mcp/dist/index.js && echo "Playwright MCP found" || echo "Playwright MCP NOT found"
   ```

2. **Test server execution**: Try running a server manually to check for errors:
   ```bash
   node node_modules/@playwright/mcp/dist/index.js --help
   ```

3. **Claude Integration**: Open Claude and verify the MCP servers appear in the available tools/context

## Troubleshooting

### Configuration files not being ignored

If your configuration files are still being tracked by Git:

```bash
# Remove from Git tracking (but keep local file)
git rm --cached .claude/mcp_config.json
git rm --cached .claude/mcp_config_merged.json
git rm --cached .claude/settings.local.json
```

### Missing example files

If example files are missing, they should be created from your working configuration:

```bash
# Create example files (after removing sensitive data)
cp mcp_config.json mcp_config.json.example
# Edit the .example file to replace real keys with placeholders
```

### MCP Server not found

If Claude can't find an MCP server:

1. **Verify installation**:
   ```bash
   npm list @playwright/mcp
   ```

2. **Reinstall if missing**:
   ```bash
   npm install --save-dev @playwright/mcp
   ```

3. **Check path in config**: Ensure `mcp_config.json` uses the correct path:
   ```json
   "args": ["node_modules/@package-name/dist/index.js"]
   ```

### MCP Server fails to start

If an MCP server fails to start:

1. **Check API keys**: Verify environment variables are set correctly in `mcp_config.json`
2. **Test manually**: Run the server directly:
   ```bash
   node node_modules/@playwright/mcp/dist/index.js
   ```
3. **Check permissions**: Ensure the server files are executable
4. **Review logs**: Look for error messages in Claude's MCP server logs

### Global vs Local Installation Issues

If you previously installed MCP servers globally:

```bash
# Uninstall global packages (optional but recommended)
npm uninstall -g @playwright/mcp

# Ensure local installation
npm install --save-dev @playwright/mcp
```

Update your `mcp_config.json` to use `node` with local paths instead of `npx` with global packages.

## Best Practices

1. **Never commit sensitive data**: Always double-check files before committing
2. **Keep examples updated**: When adding new configuration options, update the `.example` files
3. **Document required fields**: Add comments in example files explaining what values are needed
4. **Use placeholder values**: In example files, use descriptive placeholders like `"your-api-key-here"`
5. **Regular audits**: Periodically review `.gitignore` to ensure all sensitive files are excluded
6. **Local MCP installations**: Always install MCP servers locally via `npm install --save-dev`, never globally
7. **Version control dependencies**: Keep `package.json` updated with all MCP server dependencies
8. **Test after installation**: Verify MCP servers work correctly after initial setup or updates
9. **Document server requirements**: Note any API keys or special configuration needed for each MCP server

## Support

If you encounter issues with the setup process:
1. Check that all example files exist in the repository
2. Verify your `.gitignore` includes all sensitive files
3. Ensure you have the necessary API keys and credentials
4. Review the project documentation for specific configuration requirements

## Additional Resources

- [Claude AI Documentation](https://docs.anthropic.com/)
- [Model Context Protocol (MCP) Documentation](https://modelcontextprotocol.io/)
- Project-specific guidelines: `.claude/project_guidelines.md`
