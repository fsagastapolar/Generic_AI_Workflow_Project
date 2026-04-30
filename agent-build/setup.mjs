#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const CONFIG_PATH = path.join(ROOT, 'project.config.json');
const ENV_PATH = path.join(ROOT, '.env');
const ENV_EXAMPLE_PATH = path.join(ROOT, '.env.example');
const GUIDELINES_PATH = path.join(ROOT, '.claude', 'project_guidelines.md');

const THOUGHTS_SHARED_DIRS = [
  'thoughts/shared/debug',
  'thoughts/shared/e2e-test-guides',
  'thoughts/shared/plans',
  'thoughts/shared/prs',
  'thoughts/shared/reports',
  'thoughts/shared/research',
  'thoughts/shared/security-reviews',
  'thoughts/shared/templates',
];

const DEFAULT_STATES = {
  inProgress: 'In Progress',
  validation: 'Validation',
  qa: 'QA',
  done: 'Done',
};

function rl(question) {
  const interface_ = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    interface_.question(question, answer => {
      interface_.close();
      resolve(answer.trim());
    });
  });
}

function rlHidden(question) {
  return new Promise(resolve => {
    const interface_ = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    process.stdout.write(question);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    if (stdin.isTTY) stdin.setRawMode(true);
    let input = '';
    const onData = char => {
      if (char === '\n' || char === '\r' || char === '\u000d') {
        if (stdin.isTTY) stdin.setRawMode(wasRaw || false);
        stdin.removeListener('data', onData);
        interface_.close();
        process.stdout.write('\n');
        resolve(input.trim());
      } else if (char === '\u007f' || char === '\b') {
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        input += char;
        process.stdout.write('*');
      }
    };
    stdin.on('data', onData);
  });
}

function loadExistingConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

function getRepoDirname() {
  try {
    return path.basename(ROOT);
  } catch {
    return 'my-project';
  }
}

async function testLinearApiKey(apiKey) {
  try {
    const result = execSync(
      `curl -s -X POST https://api.linear.app/graphql -H "Authorization: ${apiKey}" -H "Content-Type: application/json" -d '{"query":"{ teams { nodes { id name key } } }"}'`,
      { encoding: 'utf8', timeout: 15000 }
    );
    const data = JSON.parse(result);
    if (data.errors) return { ok: false, error: data.errors[0]?.message || 'Unknown error' };
    if (!data.data?.teams?.nodes?.length) return { ok: false, error: 'No teams found' };
    return { ok: true, teams: data.data.teams.nodes };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function fetchTeamProjects(apiKey, teamId) {
  try {
    const result = execSync(
      `curl -s -X POST https://api.linear.app/graphql -H "Authorization: ${apiKey}" -H "Content-Type: application/json" -d '{"query":"{ team(id: \\"' + teamId + '\\") { projects { nodes { id name } } } }"}'`,
      { encoding: 'utf8', timeout: 15000 }
    );
    const data = JSON.parse(result);
    if (data.errors) return [];
    return data.data?.team?.projects?.nodes || [];
  } catch {
    return [];
  }
}

async function fetchTeamStates(apiKey, teamId) {
  try {
    const result = execSync(
      `curl -s -X POST https://api.linear.app/graphql -H "Authorization: ${apiKey}" -H "Content-Type: application/json" -d '{"query":"{ team(id: \\"' + teamId + '\\") { states { nodes { id name type } } } }"}'`,
      { encoding: 'utf8', timeout: 15000 }
    );
    const data = JSON.parse(result);
    if (data.errors) return [];
    return data.data?.team?.states?.nodes || [];
  } catch {
    return [];
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeEnvFile(linearConfig) {
  let existing = '';
  if (fs.existsSync(ENV_PATH)) {
    existing = fs.readFileSync(ENV_PATH, 'utf8');
  }

  const lines = [];
  const hasKey = /^LINEAR_API_KEY=/m.test(existing);
  const hasTeam = /^LINEAR_TEAM_ID=/m.test(existing);
  const hasProject = /^LINEAR_PROJECT_ID=/m.test(existing);

  if (!hasKey) lines.push(`LINEAR_API_KEY=${linearConfig.apiKey || ''}`);
  else existing = existing.replace(/^LINEAR_API_KEY=.*$/m, `LINEAR_API_KEY=${linearConfig.apiKey || ''}`);

  if (!hasTeam) lines.push(`LINEAR_TEAM_ID=${linearConfig.teamId || ''}`);
  else existing = existing.replace(/^LINEAR_TEAM_ID=.*$/m, `LINEAR_TEAM_ID=${linearConfig.teamId || ''}`);

  if (!hasProject) lines.push(`LINEAR_PROJECT_ID=${linearConfig.projectId || ''}`);
  else existing = existing.replace(/^LINEAR_PROJECT_ID=.*$/m, `LINEAR_PROJECT_ID=${linearConfig.projectId || ''}`);

  const output = lines.length > 0
    ? existing.trimEnd() + '\n' + lines.join('\n') + '\n'
    : existing;

  fs.writeFileSync(ENV_PATH, output);
}

function generateStarterGuidelines(projectName, stack) {
  const dockerPrefix = stack === 'docker' || stack === 'hybrid' ? 'docker compose exec <service>' : '';
  const localPrefix = stack === 'local' ? 'npx' : '';

  return `# ${projectName} Project Guidelines

This document contains development guidelines, best practices, and mandatory workflows for all AI agents working on the ${projectName} project.

## Project Context

${projectName} is a software solution. Fill in your tech stack details below.

## Environment Constraints

${stack === 'docker' || stack === 'hybrid' ? `### Backend (Docker)
- Run backend commands inside Docker containers
- Use \`docker compose exec <service> <command>\` for all backend operations
- NEVER run backend commands directly on the host machine

` : ''}${stack === 'local' ? `### Backend (Local)
- Run backend commands directly on the host machine
- Ensure all dependencies are installed locally

` : ''}### Scope Boundaries
- **DO NOT** modify infrastructure configuration without explicit approval
- **DO NOT** run destructive database commands without confirmation

## Git Workflow (MANDATORY)

### Branching Strategy
- Feature branches: \`feature/<ticket-id>-description\`
- Bug fixes: \`bugfix/<ticket-id>-description\`
- Hotfixes: \`hotfix/<ticket-id>-description\`
- **MUST** branch from the appropriate base branch
- **NEVER** commit directly to \`main\`

### Commit Message Format
\`\`\`
[type]([scope]): [subject]

[optional body]
\`\`\`

Types: \`feat\`, \`fix\`, \`docs\`, \`style\`, \`refactor\`, \`test\`, \`chore\`

## Testing Requirements (MANDATORY)

1. **Every feature or change MUST be accompanied by new or updated tests.**
2. **Under NO circumstances should tests be modified to pass a change that introduces a bug.**
3. Minimum coverage: 80%

## Security Practices
- NEVER commit secrets, API keys, or credentials to the repository
- Use environment variables for all sensitive configuration
- Run security reviews before major changes

## Reference Checklist for Agents

When implementing features or making changes:
1. Always use the correct execution environment (${stack})
2. Run tests for all changes
3. Follow the git workflow conventions
4. Never commit secrets or credentials
5. Create/update documentation as needed
`;
}

async function polishGuidelines(existingContent, stack) {
  const sections = [
    { name: 'Project Context', pattern: /^## Project Context/m },
    { name: 'Environment Constraints', pattern: /^## Environment Constraints/m },
    { name: 'Git Workflow', pattern: /^## Git Workflow/m },
    { name: 'Testing Requirements', pattern: /^## Testing Requirements/m },
    { name: 'Security Practices', pattern: /^## Security Practices/m },
    { name: 'Reference Checklist', pattern: /^## Reference Checklist/m },
  ];

  const missing = sections.filter(s => !s.pattern.test(existingContent));

  if (missing.length === 0) {
    console.log('\nAll standard sections found in guidelines. Nothing to polish.\n');
    return null;
  }

  console.log(`\nFound ${missing.length} missing section(s):`);
  missing.forEach((s, i) => console.log(`  ${i + 1}. ${s.name}`));

  const additions = [];
  for (const section of missing) {
    const answer = await rl(`\nAdd "${section.name}"? (Y/n): `);
    if (answer.toLowerCase() !== 'n') {
      additions.push(section.name);
    }
  }

  return additions.length > 0 ? additions : null;
}

function appendSectionsToGuidelines(content, sectionNames, stack) {
  let appended = '\n';
  for (const name of sectionNames) {
    switch (name) {
      case 'Project Context':
        appended += `## Project Context\n\nTODO: Describe your project, tech stack, and key features.\n\n`;
        break;
      case 'Environment Constraints':
        appended += `## Environment Constraints\n\n${stack === 'docker' ? '- Run commands inside Docker containers\n- Use `docker compose exec <service> <command>`\n' : stack === 'local' ? '- Run commands directly on host machine\n' : '- Use appropriate execution context per service\n'}\n`;
        break;
      case 'Git Workflow':
        appended += `## Git Workflow (MANDATORY)\n\n- Feature branches: \`feature/<ticket-id>-description\`\n- Bug fixes: \`bugfix/<ticket-id>-description\`\n- NEVER commit directly to \`main\`\n\n`;
        break;
      case 'Testing Requirements':
        appended += `## Testing Requirements (MANDATORY)\n\n1. Every feature MUST have tests\n2. Never modify tests to pass a buggy change\n3. Minimum coverage: 80%\n\n`;
        break;
      case 'Security Practices':
        appended += `## Security Practices\n\n- NEVER commit secrets or API keys\n- Use environment variables for sensitive config\n\n`;
        break;
      case 'Reference Checklist':
        appended += `## Reference Checklist for Agents\n\n1. Use correct execution environment\n2. Run tests for all changes\n3. Follow git workflow conventions\n4. Never commit secrets\n\n`;
        break;
    }
  }
  return content.trimEnd() + appended;
}

async function main() {
  console.log('=== Generic AI Workflow Project Setup ===\n');

  const existing = loadExistingConfig();
  if (existing) {
    console.log('Found existing project.config.json. Using current values as defaults.\n');
  }

  const defaults = existing || {};
  const projectDefaults = defaults.project || {};
  const linearDefaults = defaults.linear || {};

  const projectName = await rl(`Project name (${projectDefaults.name || getRepoDirname()}): `) || projectDefaults.name || getRepoDirname();

  console.log('\nStack options: docker / local / hybrid');
  const stack = await rl(`Project stack (${projectDefaults.stack || 'local'}): `) || projectDefaults.stack || 'local';

  const defaultGuidelinesPath = projectDefaults.guidelinesPath || '.claude/project_guidelines.md';
  const guidelinesPath = await rl(`Guidelines file path (${defaultGuidelinesPath}): `) || defaultGuidelinesPath;
  const absGuidelinesPath = path.join(ROOT, guidelinesPath);

  if (fs.existsSync(absGuidelinesPath)) {
    console.log('\nFound existing guidelines file.');
    const choice = await rl('(1) Keep as-is  (2) Polish (fill gaps)  (3) Start fresh: ');
    if (choice === '2') {
      const existingContent = fs.readFileSync(absGuidelinesPath, 'utf8');
      const additions = await polishGuidelines(existingContent, stack);
      if (additions) {
        const updated = appendSectionsToGuidelines(existingContent, additions, stack);
        fs.writeFileSync(absGuidelinesPath, updated);
        console.log('Guidelines polished with missing sections added.');
      }
    } else if (choice === '3') {
      const confirm = await rl('This will overwrite the existing file. Continue? (y/N): ');
      if (confirm.toLowerCase() === 'y') {
        fs.writeFileSync(absGuidelinesPath, generateStarterGuidelines(projectName, stack));
        console.log('Starter guidelines generated.');
      }
    } else {
      console.log('Keeping existing guidelines as-is.');
    }
  } else {
    const generate = await rl('Generate starter project_guidelines.md? (Y/n): ');
    if (generate.toLowerCase() !== 'n') {
      ensureDir(path.dirname(absGuidelinesPath));
      fs.writeFileSync(absGuidelinesPath, generateStarterGuidelines(projectName, stack));
      console.log('Starter guidelines generated.');
    }
  }

  let linearEnabled = linearDefaults.enabled !== undefined ? linearDefaults.enabled : false;
  let linearConfig = {
    apiKey: '',
    teamId: '',
    projectId: '',
    workflowStates: { ...DEFAULT_STATES },
  };

  if (fs.existsSync(ENV_PATH)) {
    const envContent = fs.readFileSync(ENV_PATH, 'utf8');
    const keyMatch = envContent.match(/^LINEAR_API_KEY=(.+)$/m);
    const teamMatch = envContent.match(/^LINEAR_TEAM_ID=(.+)$/m);
    const projectMatch = envContent.match(/^LINEAR_PROJECT_ID=(.+)$/m);
    if (keyMatch) linearConfig.apiKey = keyMatch[1].trim();
    if (teamMatch) linearConfig.teamId = teamMatch[1].trim();
    if (projectMatch) linearConfig.projectId = projectMatch[1].trim();
    if (linearConfig.apiKey && linearConfig.teamId) linearEnabled = true;
  }

  const enableLinearAnswer = await rl(`\nEnable Linear integration? (${linearEnabled ? 'Y/n' : 'y/N'}): `);
  if (enableLinearAnswer.toLowerCase() === 'y' || (linearEnabled && enableLinearAnswer.toLowerCase() !== 'n')) {
    linearEnabled = true;

    let apiKey = linearConfig.apiKey;
    let teams = [];
    let validKey = false;

    while (!validKey) {
      apiKey = await rlHidden('Linear API key: ');
      if (!apiKey && linearConfig.apiKey) {
        apiKey = linearConfig.apiKey;
      }

      console.log('Testing API key...');
      const result = await testLinearApiKey(apiKey);
      if (result.ok) {
        teams = result.teams;
        validKey = true;
        linearConfig.apiKey = apiKey;
        console.log('API key valid.\n');
      } else {
        console.log(`Invalid key: ${result.error}`);
        const retry = await rl('Retry? (Y/n): ');
        if (retry.toLowerCase() === 'n') {
          linearEnabled = false;
          break;
        }
      }
    }

    if (linearEnabled && teams.length > 0) {
      console.log('Select team:');
      teams.forEach((t, i) => console.log(`  ${i + 1}. ${t.name} (${t.key})`));
      const teamChoice = await rl(`Team number (1-${teams.length}): `);
      const teamIdx = Math.max(0, Math.min(teams.length - 1, parseInt(teamChoice, 10) - 1));
      const selectedTeam = teams[teamIdx];
      linearConfig.teamId = selectedTeam.id;
      console.log(`Selected: ${selectedTeam.name}\n`);

      const projects = await fetchTeamProjects(apiKey, selectedTeam.id);
      let selectedProject = null;
      if (projects.length > 0) {
        console.log('Select project:');
        projects.forEach((p, i) => console.log(`  ${i + 1}. ${p.name}`));
        console.log(`  ${projects.length + 1}. None`);
        const projChoice = await rl(`Project number (1-${projects.length + 1}): `);
        const projIdx = parseInt(projChoice, 10) - 1;
        if (projIdx >= 0 && projIdx < projects.length) {
          selectedProject = projects[projIdx];
          linearConfig.projectId = selectedProject.id;
          console.log(`Selected: ${selectedProject.name}\n`);
        } else {
          linearConfig.projectId = '';
          console.log('No project selected.\n');
        }
      } else {
        linearConfig.projectId = '';
        console.log('No projects found for this team.\n');
      }

      const states = await fetchTeamStates(apiKey, selectedTeam.id);
      if (states.length > 0) {
        console.log('Detected workflow states:');
        states.forEach(s => console.log(`  ${s.name} (${s.type})`));

        const usedDefaults = Object.entries(DEFAULT_STATES).every(([key, val]) =>
          states.some(s => s.name === val)
        );

        if (usedDefaults) {
          console.log('Standard state names detected. Using defaults.');
        } else {
          console.log('\nSome default state names not found in your workspace.');
          const override = await rl('Override any state names? (y/N): ');
          if (override.toLowerCase() === 'y') {
            for (const [key, defaultName] of Object.entries(DEFAULT_STATES)) {
              const current = linearDefaults.workflowStates?.[key] || defaultName;
              const newVal = await rl(`  ${key} (${current}): `);
              if (newVal) {
                linearConfig.workflowStates[key] = newVal;
              } else {
                linearConfig.workflowStates[key] = current;
              }
            }
          }
        }
      }
    }
  } else {
    linearEnabled = false;
  }

  console.log('\nEnsuring thoughts/shared/ directory structure...');
  THOUGHTS_SHARED_DIRS.forEach(dir => {
    const absDir = path.join(ROOT, dir);
    if (!fs.existsSync(absDir)) {
      ensureDir(absDir);
      console.log(`  Created: ${dir}`);
    }
  });

  const config = {
    version: 1,
    project: {
      name: projectName,
      stack: stack,
      guidelinesPath: guidelinesPath,
    },
  };

  if (linearEnabled) {
    config.linear = {
      enabled: true,
      workflowStates: linearConfig.workflowStates,
    };
  } else {
    config.linear = {
      enabled: false,
    };
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
  console.log(`\nWrote: project.config.json`);

  if (linearEnabled) {
    writeEnvFile(linearConfig);
    console.log('Updated: .env');
  }

  const runBuild = await rl('\nRun build now? (Y/n): ');
  if (runBuild.toLowerCase() !== 'n') {
    console.log('\nRunning build...');
    try {
      execSync('node build.mjs', { cwd: __dirname, stdio: 'inherit' });
    } catch (e) {
      console.log('Build failed. You can run it manually: cd agent-build && node build.mjs');
    }
  }

  console.log('\nSetup complete!');
}

main().catch(e => {
  console.error('Setup failed:', e.message);
  process.exit(1);
});
