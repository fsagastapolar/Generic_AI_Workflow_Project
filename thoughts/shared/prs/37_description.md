# PR Description: Remove Hardcoded Credentials from Docker Configuration

## Summary
This PR addresses a critical security vulnerability by removing all hardcoded database credentials from `docker-compose.yml` and migrating them to environment variables. This change prevents sensitive credentials from being committed to version control while maintaining ease of local development setup through comprehensive documentation.

## Changes Made
- **docker-compose.yml**: Replaced all hardcoded credentials (DB_PASSWORD, DB_ROOT_PASSWORD, database name, username) with environment variable references using `${VAR_NAME}` syntax with sensible defaults where appropriate
- **.env.example**: Updated to include placeholder values for `DB_PASSWORD` and `DB_ROOT_PASSWORD` with instructive variable names (`your_local_password_here`, `your_root_password_here`)
- **.gitignore**: Added `docker-compose.override.yml` to prevent committing local configuration overrides
- **SETUP.md**: Created comprehensive setup guide with step-by-step instructions for:
  - Quick start (5-minute setup)
  - Environment variable configuration
  - Production deployment guidance
  - Common troubleshooting scenarios
- **README.md**: Added header section with project description and link to SETUP.md for improved discoverability

## Security Impact
**Before**: Database credentials (`password`, `rootpassword`) were hardcoded in `docker-compose.yml` and committed to version control, exposing them in:
- Public/private repository history
- Any forked repositories
- Local clones by all developers

**After**: All credentials are externalized to `.env` file which is:
- Git-ignored and never committed
- Unique per environment (local, staging, production)
- Easy to rotate without code changes

## Testing
- [x] Local Docker environment starts successfully with environment variables
- [x] All containers (app, mysql, phpmyadmin) connect properly
- [x] Database migrations run without errors
- [x] PhpMyAdmin authentication works with env-based credentials
- [ ] Manual testing: Verify fresh clone setup following SETUP.md instructions
- [ ] Manual testing: Confirm production deployment process in separate environment

## Additional Context

### Breaking Changes
**ACTION REQUIRED**: All developers must update their local environment:
1. Pull the latest changes from this branch
2. Copy `.env.example` to `.env` (if not already done)
3. Set `DB_PASSWORD` and `DB_ROOT_PASSWORD` in `.env` file
4. Run `docker-compose down -v && docker-compose up -d` to recreate containers with new credentials

### Migration Notes
- The old hardcoded passwords (`password`, `rootpassword`) are no longer used
- Default fallback values are provided for local development convenience, but `.env` must still be created
- For existing local databases, either:
  - Set `.env` passwords to match your current setup, OR
  - Run `docker-compose down -v` to start fresh with new passwords

### Future Improvements
- Consider using Docker secrets for production deployments
- Add docker-compose.prod.yml for production-specific configuration
- Implement secrets management service (HashiCorp Vault, AWS Secrets Manager, etc.)

## Related Issues/Tickets
- Addresses security vulnerability: Hardcoded credentials in version control
- Improves developer onboarding with comprehensive SETUP.md documentation
