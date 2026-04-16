# FlexYa Project Guidelines

This document contains development guidelines, best practices, and mandatory workflows for all AI agents working on the FlexYa project.

## Project Context

FlexYa is a closed-network logistics and last-mile delivery management system integrated with Mercado Libre APIs. It manages package pickup, routing, delivery, and financial tracking for sellers, drop points (EPR), and couriers.

- **Backend**: Python 3.11+ with FastAPI, SQLAlchemy 2.0 (async), Alembic, JWT auth
- **Frontend Web**: React 18+ with TypeScript, Vite, Tailwind CSS, Zustand, React Router v6
- **Mobile App**: Flutter (Dart) with Riverpod/BLoC, offline-first SQLite
- **Database**: PostgreSQL 15+
- **Infrastructure**: Docker & Docker Compose (dev and production)
- **Landing Page**: Next.js (deployed on Cloudflare Pages, separate from main frontend)

## Language Policy

- **Code, comments, variables, commits**: English only
- **UI strings / user-facing text**: Spanish (Argentina) — the end user reads everything in Spanish

## Environment Constraints

### Backend
- **Execution Environment**: Docker containers ONLY
- **MUST** run all backend commands via `docker compose exec api ...` (or the appropriate service name)
- **NEVER** run Python, pip, alembic, or uvicorn directly on the host machine
- **NEVER** run database migrations without verifying the current migration state first
- Service names (docker-compose):
  - `api`: FastAPI application (Uvicorn)
  - `db`: PostgreSQL 15+
  - `worker`: Background job processor (webhook events, token refresh)

### Frontend Web (Admin Panel)
- **Execution Environment**: Docker container
- **MUST** run via `docker compose exec web ...` or `docker compose up web`
- **NEVER** run `npm install` or `npm run dev` directly on the host for the admin panel
- Node 20+, npm as package manager

### Landing Page (Next.js)
- **Execution Environment**: Local development is acceptable (Cloudflare Pages deploy)
- Located at `Frontend/flexya-landing/`
- Has its own CLAUDE.md — follow those instructions when working on landing

### Mobile App (Flutter)
- **Execution Environment**: Local machine (Flutter SDK required)
- Located at `mobile-app/`
- Not containerized

### Database
- **Type**: PostgreSQL 15+
- **Access method**: `docker compose exec db psql -U <user> -d <database>`
- **Connection**: Via Docker internal network (service name `db`, port 5432)
- Configuration via environment variables (see `.env.example`)

### Scope Boundaries
- **DO NOT** install global npm packages — all dependencies are local to their respective directories
- **DO NOT** run backend or frontend-web services outside of Docker
- **DO NOT** store secrets, API keys, or credentials in committed files
- **DO NOT** use SQLite or any database other than PostgreSQL

## Database Requirements (MANDATORY)

### PostgreSQL Only
- **MUST** use PostgreSQL 15+ as the sole database
- **NEVER** use SQLite, MySQL, or any alternative
- **NEVER** create `.sqlite` or `.db` files
- Database config lives in environment variables loaded via Pydantic `BaseSettings`

### Migrations (Alembic) — Unified Strategy
- **During development**, keep migrations unified: squash/consolidate migration files rather than stacking dozens of incremental files
- When modifying models, prefer updating the existing migration rather than creating a new one (during development phase only)
- Before creating a new migration, check if the current head migration can be amended
- **MUST** run migrations inside the Docker container: `docker compose exec api alembic upgrade head`
- **NEVER** run `alembic` commands on the host machine
- Migration files live in `backend/alembic/`

## Git Workflow (MANDATORY)

### Branching Strategy

**Main branches:**
- `main`: Production-ready code. Protected — no direct commits.
- `develop`: Integration branch for ongoing work. All feature branches merge here.

**Branch naming convention:**
- Feature branches: `feature/<short-description>`
- Bug fixes: `bugfix/<short-description>`
- Hotfixes: `hotfix/<short-description>`
- Setup/infra: `setup/<short-description>`

**Rules:**
- **MUST** branch from `develop`
- **NEVER** commit directly to `main` or `develop`
- **MUST** create PR for all changes targeting `develop`
- PRs to `main` only for releases/hotfixes

### Commit Message Format
```
<type>(<scope>): <subject>

[optional body]

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`
Scopes: `backend`, `frontend`, `landing`, `mobile`, `infra`, `docs`

## Docker & Environment Setup

### Environment Files
- `.env` files are **NEVER** committed to git
- `.env.example` templates **MUST** exist with placeholder values and clear comments
- Separate configs for development and production:
  - `.env.example` — development defaults
  - `.env.production.example` — production template
- Docker Compose reads from `.env` in project root

### Docker Compose Services (Development)
```yaml
services:
  db:        # PostgreSQL 15+
  api:       # FastAPI (backend)
  worker:    # Background job processor
  web:       # React admin panel (Vite dev server)
```

### Production vs Development
- Development: hot-reload enabled, debug logging, CORS allows `*`
- Production: optimized builds, strict CORS, proper SSL termination
- Use Docker build targets or separate compose files for prod vs dev

## Technical Best Practices

### Python / FastAPI
- Use async endpoints where possible
- Pydantic v2 for all request/response schemas
- Dependency injection via FastAPI's `Depends()`
- Business logic in `services/`, not in routers
- All config via `pydantic-settings` BaseSettings (env vars)

### React / TypeScript
- Functional components only, no class components
- Zustand for global state, React Query for server state
- Strict TypeScript — no `any` types unless absolutely necessary
- Components in `components/`, domain features in `features/`
- API clients in `services/`

### Database Practices
- **Migrations**: Unified during development (see above)
- **Models**: SQLAlchemy 2.0 declarative style in `backend/app/db/models.py`
- **UUIDs**: Use UUID primary keys for all tables
- **Naming**: snake_case for tables and columns

### API Design
- **Versioning**: URL prefix `/api/v1/`
- **Authentication**: JWT via `Authorization: Bearer <token>`
- **Response format**: Consistent JSON with proper HTTP status codes
- **Error handling**: Structured error responses with error codes

## Testing Requirements (MANDATORY)

### 1. Test Creation
Every feature or change MUST be accompanied by new or updated tests.

### 2. Test Modification Guardrail
NEVER modify tests to make them pass when the underlying code is wrong. Fix the code, not the test.

### 3. Testing Types
- **Unit tests**: pytest for backend, Vitest for frontend
- **Integration tests**: Hit real database (Docker PostgreSQL), no mocks for DB
- **E2E tests**: Playwright via the `react-tester` agent (subagent only). **Before spawning `react-tester`, always rebuild the frontend container** to avoid testing against a stale build:
  ```bash
  docker compose build web && docker compose up -d web
  ```
  If cache issues are suspected, do a clean rebuild:
  ```bash
  docker compose build --no-cache web && docker compose up -d web
  ```

### 4. Running Tests
- Backend: `docker compose exec api pytest`
- Frontend: `docker compose exec web npm test`
- E2E: Delegated to `react-tester` subagent (uses Playwright MCP)

## Manual Testing Documentation (MANDATORY)

### Testing Guide Strategy

After completing any implementation, create appropriate testing guides based on what was changed:

#### 1. API/Backend Changes: E2E API Test Guide

**When to Create**: Any implementation that adds or modifies API endpoints, backend logic, or database structure.

**How to Create**: Use the `e2e-test-guide-creator` agent (invoked as a Task during implementation):
- The agent will research the codebase, locate database seeders, analyze endpoints, and generate comprehensive API test guides
- It produces ready-to-run curl commands, seeded data IDs, SQL queries, and relevant commands
- This maximizes QA tester efficiency by eliminating manual lookup work

**Location**: `thoughts/shared/e2e-test-guides/YYYY-MM-DD-[feature]-api-test-guide.md`

**Agent-Generated Content Includes**:
- Complete curl commands with headers and JSON bodies
- Seeded user/entity IDs from database seeders
- Authentication token retrieval steps with full API calls
- Database verification queries
- Entity creation steps when seeded data insufficient
- Edge case testing (validation errors, authorization failures)
- Environment-specific commands for backend/database operations

**Example Structure**:
```markdown
# E2E API Test Guide: [Feature Name]

## Prerequisites
- [ ] [Environment setup step 1]
- [ ] [Environment setup step 2]
- [ ] [Database seeded]

## Authentication Setup
```bash
# Example curl command for authentication
```

**Seeded Users**: [List of seeded test users/entities]

## Test Scenarios

### Scenario 1: [Test Case Name]
```bash
# Example API call
```

**Expected Response**:
```json
{
  "expected": "response"
}
```

**Verify in Database**:
```bash
# Database verification command
```
```

#### 2. Frontend Changes: Frontend E2E Test Guide

**When to Create**: Any implementation that adds or modifies UI components, user flows, or frontend behavior.

**How to Create**: Manually document test scenarios for the `react-tester` agent (E2E testing agent).

**Location**: `thoughts/shared/e2e-test-guides/YYYY-MM-DD-[feature]-frontend-test-guide.md`

**Required Content**:
- User flows and test scenarios
- `data-testid` attributes for test selection (highest priority selector)
- Setup prerequisites (URLs, test data, credentials)
- Expected outcomes and verification points
- Research-Plan-Execute workflow structure

#### 3. General/Full-Stack Features: Manual Test Guide

**When to Create**: For features requiring manual verification, complex workflows, or visual testing that spans multiple layers.

**Location**: `thoughts/shared/testing/YYYY-MM-DD-[ticket-id]-manual-test-guide.md`

**Required Content**:
1. **Changes Summary**: What was implemented
2. **Prerequisites**: Environment setup needed
3. **Test Scenarios**: Step-by-step instructions for each feature/change
4. **Expected Results**: What should happen at each step
5. **Edge Cases**: Boundary conditions and error scenarios to test
6. **Rollback Steps**: How to undo changes if issues are found

### Template Format
```markdown
# Manual Testing Guide: [Feature Name]

## Implementation Summary
- [Brief description of changes]
- Ticket: [TICKET-ID] (if applicable)
- Implementation Date: YYYY-MM-DD

## Prerequisites
- [ ] [Setup requirement 1]
- [ ] [Setup requirement 2]
- [ ] [Database/environment ready]

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

## Security Practices
- JWT tokens with proper expiration
- Password hashing with bcrypt
- OAuth 2.0 for Mercado Libre integration
- All secrets in environment variables, never in code
- Input validation on all API endpoints
- CORS properly configured per environment

## Seed Data Maintenance (MANDATORY)

When adding new features, workflows, entities, states, or enums, you **MUST** update the dummy seed data to reflect these additions. The seed data should always be a complete representation of all possible system states and entities.

**Examples:**
- Adding a new shipment status (e.g., `returned_to_sender`) → update the seeder to generate shipments with that status
- Adding a new entity type (e.g., `Warehouse`) → add seed records for warehouses
- Adding a new role or permission → include users with that role in seed data
- Adding new workflow transitions → ensure seed data covers each transition state

**Why this matters:** Seed data is used for development, manual QA testing, and E2E test guides. If new states/entities aren't represented in seed data, they effectively can't be tested without manual setup — defeating the purpose of automated seeding.

## Reference Checklist for Agents

When implementing features or making changes:
1. All backend/frontend-web commands run inside Docker
2. Branch from `develop`, never commit directly to `main`
3. Create/update tests for all changes
4. Keep migrations unified (don't stack files during dev)
5. No secrets in committed files — use `.env.example` templates
6. English for code, Spanish for UI strings
7. PostgreSQL only — no SQLite, no MySQL
8. Playwright/E2E testing via `react-tester` subagent only — rebuild `web` container first
9. Update seed data when adding new entities, states, workflows, or enums

## Troubleshooting Common Issues

### Issue: Cannot connect to database
**Symptoms**: Connection refused on port 5432
**Cause**: Docker db service not running
**Solution**: `docker compose up db -d` and wait for health check

### Issue: Migration conflicts
**Symptoms**: Alembic "multiple heads" error
**Cause**: Multiple developers creating migrations in parallel
**Solution**: `docker compose exec api alembic merge heads` then consolidate

### Issue: Node modules missing in container
**Symptoms**: Module not found errors in frontend
**Cause**: Volumes not synced or dependencies not installed
**Solution**: `docker compose exec web npm install` or rebuild: `docker compose build web`

### Issue: react-tester tests stale/outdated frontend
**Symptoms**: Implemented features appear missing or broken in Playwright tests, but the code is correct
**Cause**: The `web` Docker container is serving a cached old build
**Solution**: Rebuild and restart before running E2E tests:
```bash
docker compose build web && docker compose up -d web
# or for a full clean rebuild:
docker compose build --no-cache web && docker compose up -d web
```
