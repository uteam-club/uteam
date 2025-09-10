# GitHub Workflows

## GPS Module CI

### gps-ci-lite.yml (Active on main)
Lightweight CI workflow for GPS module that runs on main branch and PRs to main. Includes:
- Lint checks for GPS-related code
- TypeScript type checking
- GPS unit tests (canon + services)
- Code-only readiness check (no database dependencies)

### gps-e2e-manual.yml (Manual only)
Heavy E2E testing workflow that requires database access and browser installation. 
Only runs manually via workflow_dispatch when full E2E testing is needed.

### gps-ci.yml (Disabled on main)
Legacy workflow that included database-dependent jobs. Now disabled on main branch 
to prevent CI failures due to missing database secrets. Still runs on other branches 
for backward compatibility.

## Migration Notes

The old workflow was causing CI failures due to:
- Database dependencies in e2e-tests and readiness-check jobs
- Heavy browser installation requirements
- Missing secrets in CI environment

The new gps-ci-lite workflow provides fast, reliable CI checks without external dependencies.
