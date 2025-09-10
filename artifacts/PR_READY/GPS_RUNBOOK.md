# GPS Module Operational Runbook

**Version**: P0 Foundation  
**Last Updated**: 2024-09-10  
**Maintainer**: Lead Engineer

## 🎯 Overview

This runbook provides operational procedures for the GPS module, including deployment, monitoring, maintenance, and troubleshooting.

## 🚀 Pre-Deployment Checklist

### Database Backup
```bash
# Create full database backup
pg_dump --no-owner --format=custom --file=gps_p0_backup_$(date +%Y%m%d_%H%M%S).backup "$DATABASE_URL"

# Verify backup size
ls -lh gps_p0_backup_*.backup
```

### Readiness Verification
```bash
# Run comprehensive readiness check
tsx scripts/gps/readiness-check.ts

# Expected output: 9/9 checks PASS
# If any FAIL, investigate before deployment
```

### Migration Verification
```bash
# Verify migration script is safe
cat drizzle/1757437762_gps_snapshot_safe.sql

# Should only contain:
# - ALTER TABLE ADD COLUMN IF NOT EXISTS
# - CREATE INDEX IF NOT EXISTS
# - No DROP, RENAME, or ALTER TYPE operations
```

## 🚀 Deployment Process

### Step 1: Deploy Code
```bash
# Deploy to staging first
git checkout main
git pull origin main
npm install
npm run build

# Verify build success
echo "Build completed successfully"
```

### Step 2: Apply Database Migration
```bash
# Apply safe migration
tsx scripts/db/apply-safe-migration.ts

# Verify migration success
tsx scripts/db/verify-safe-migration.ts
```

### Step 3: Post-Deployment Verification
```bash
# Run readiness check
tsx scripts/gps/readiness-check.ts

# Expected: 9/9 PASS
# If any FAIL, investigate immediately
```

### Step 4: Smoke Tests
```bash
# Import demo data
npm run gps:seed:demo
npm run gps:import:demo

# Verify data integrity
npm run gps:verify:demo

# Expected output:
# - 2 demo reports created
# - Both have 5 rows of data
# - Both have profileSnapshot.columns > 0
# - Canonical data unified (same total_distance_m)
```

### Step 5: UI Verification
```bash
# Start dev server (dev environment only)
npm run dev

# Test dev page (replace <report-id> with actual ID)
# Visit: http://localhost:3000/dev/gps-report/<report-id>

# Expected:
# - Page loads without errors
# - Shows 5 rows of data
# - Headers match profile configuration
# - Data values are correct
```

## 📊 Monitoring & Alerts

### Key Metrics to Monitor

#### Import Performance
- **Metric**: GPS import processing time
- **Threshold**: > 5 seconds per file
- **Action**: Investigate slow imports, check file size/complexity

#### Data Quality
- **Metric**: Ingest errors per 10 minutes
- **Threshold**: > 0 errors
- **Action**: Check file format, profile configuration

#### Unknown Headers
- **Metric**: Percentage of unmapped columns
- **Threshold**: > 0%
- **Action**: Update profile configuration, add new mappings

#### Player Mappings
- **Metric**: New manual player mappings per day
- **Threshold**: > 10 per day
- **Action**: Review player name consistency, improve auto-mapping

### Monitoring Queries

#### Check Import Performance
```sql
-- Average import time by day
SELECT 
    DATE("createdAt") as date,
    COUNT(*) as imports,
    AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt"))) as avg_seconds
FROM "GpsReport" 
WHERE "createdAt" > NOW() - INTERVAL '7 days'
GROUP BY DATE("createdAt")
ORDER BY date DESC;
```

#### Check Data Quality
```sql
-- Reports with processing issues
SELECT 
    id,
    name,
    "fileName",
    "isProcessed",
    "createdAt"
FROM "GpsReport" 
WHERE "isProcessed" = false 
    AND "createdAt" > NOW() - INTERVAL '24 hours'
ORDER BY "createdAt" DESC;
```

#### Check Snapshot Health
```sql
-- Reports without proper snapshots
SELECT 
    COUNT(*) as total_reports,
    SUM(CASE WHEN "profileSnapshot" IS NULL THEN 1 ELSE 0 END) as no_snapshot,
    SUM(CASE WHEN jsonb_array_length("profileSnapshot"->'columns') = 0 THEN 1 ELSE 0 END) as empty_columns
FROM "GpsReport";
```

## 🛠️ Maintenance Procedures

### Weekly Tasks

#### Clean Empty Reports
```bash
# Remove reports with no data
tsx scripts/gps/prune-empty-reports.ts

# Review what was removed
cat artifacts/prune-empty-reports.log
```

#### Check System Health
```bash
# Run comprehensive health check
tsx scripts/gps/readiness-check.ts

# Review any warnings or failures
cat artifacts/GPS_READINESS_SUMMARY.md
```

### Monthly Tasks

#### Review Profile Usage
```sql
-- Most used profiles
SELECT 
    p.name,
    p."gpsSystem",
    COUNT(r.id) as report_count
FROM "GpsProfile" p
LEFT JOIN "GpsReport" r ON p.id = r."profileId"
GROUP BY p.id, p.name, p."gpsSystem"
ORDER BY report_count DESC;
```

#### Analyze Import Patterns
```sql
-- Import volume by GPS system
SELECT 
    "gpsSystem",
    COUNT(*) as imports,
    AVG(jsonb_array_length("processedData"->'canonical'->'rows')) as avg_rows
FROM "GpsReport" 
WHERE "createdAt" > NOW() - INTERVAL '30 days'
GROUP BY "gpsSystem"
ORDER BY imports DESC;
```

### Quarterly Tasks

#### Update Canonical Registry
- Review `src/canon/metrics.registry.json`
- Add new metrics if needed
- Update version number
- Test with existing reports

#### Review Test Coverage
```bash
# Run all tests
npm test

# Run E2E tests
npm run test:e2e:gps

# Check test coverage
npm run test:coverage
```

## 🚨 Troubleshooting

### Common Issues

#### Import Failures
**Symptoms**: Reports not importing, error messages
**Diagnosis**:
```bash
# Check recent imports
tsx scripts/gps/inspect-report.ts

# Review error logs
tail -f logs/gps-import.log
```

**Solutions**:
1. Check file format (CSV/Excel)
2. Verify profile configuration
3. Check column header spelling
4. Validate data types

#### Missing Snapshots
**Symptoms**: Reports show "Snapshot columns missing"
**Diagnosis**:
```sql
-- Find reports without snapshots
SELECT id, name, "profileSnapshot" 
FROM "GpsReport" 
WHERE "profileSnapshot" IS NULL 
   OR jsonb_array_length("profileSnapshot"->'columns') = 0;
```

**Solutions**:
```bash
# Run backfill
tsx scripts/gps/backfill-empty-snapshot-columns.ts

# Verify results
tsx scripts/gps/readiness-check.ts
```

#### Performance Issues
**Symptoms**: Slow imports, timeouts
**Diagnosis**:
```sql
-- Check recent import times
SELECT 
    name,
    "fileName",
    EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) as seconds
FROM "GpsReport" 
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY seconds DESC;
```

**Solutions**:
1. Check file size (split large files)
2. Review profile complexity
3. Check database performance
4. Monitor system resources

### Emergency Procedures

#### Rollback Deployment
```bash
# 1. Revert code (if needed)
git checkout <previous-commit>
npm install
npm run build

# 2. No database rollback needed (safe migration)
# 3. Restart services
# 4. Verify functionality
```

#### Data Recovery
```bash
# Restore from backup
pg_restore --clean --if-exists gps_p0_backup_*.backup

# Verify data integrity
tsx scripts/gps/verify-demo.ts
```

## 📞 Escalation Procedures

### Level 1: Basic Issues
- **Scope**: Import failures, profile configuration
- **Response**: Within 4 hours
- **Actions**: Check logs, verify configuration, test with sample data

### Level 2: System Issues
- **Scope**: Performance problems, data corruption
- **Response**: Within 2 hours
- **Actions**: Run diagnostics, check system resources, review recent changes

### Level 3: Critical Issues
- **Scope**: Data loss, system down, security issues
- **Response**: Within 30 minutes
- **Actions**: Immediate investigation, rollback if needed, notify stakeholders

## 📚 Documentation References

- **Architecture**: `docs/adr/ADR-0001-gps-canonical-snapshot.md`
- **User Guide**: `docs/howto/ADD_NEW_GPS_SYSTEM.md`
- **Release Notes**: `docs/RELEASE_NOTES_GPS_P0.md`
- **API Documentation**: `src/app/api/gps-*/route.ts`

## 🔧 Tools & Scripts

### Health Checks
- `tsx scripts/gps/readiness-check.ts` - Comprehensive health check
- `tsx scripts/gps/verify-demo.ts` - Data integrity verification
- `tsx scripts/gps/inspect-report.ts` - Individual report inspection

### Maintenance
- `tsx scripts/gps/prune-empty-reports.ts` - Cleanup empty reports
- `tsx scripts/gps/backfill-empty-snapshot-columns.ts` - Restore snapshots
- `tsx scripts/db/verify-safe-migration.ts` - Database verification

### Testing
- `npm run test:e2e:gps` - E2E tests
- `npm run gps:import:demo` - Demo data import
- `npm run gps:verify:demo` - Demo data verification

---

**Last Updated**: 2024-09-10  
**Next Review**: 2024-10-10
