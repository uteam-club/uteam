# GPS System Purge Plan

## Overview
This document outlines a step-by-step plan for safely removing the GPS system from the codebase. The plan is designed to minimize risk and ensure system stability throughout the process.

## Pre-Purge Checklist

### 1. Backup and Documentation
- [ ] Create full database backup
- [ ] Export all GPS data to JSON/CSV for potential recovery
- [ ] Document current GPS usage statistics
- [ ] Take screenshots of GPS UI for reference

### 2. Feature Flag Implementation (Optional)
- [ ] Add `DISABLE_GPS_V1` environment variable
- [ ] Hide GPS navigation items when flag is enabled
- [ ] Disable GPS API endpoints when flag is enabled
- [ ] Test feature flag functionality

## Phase 1: Preparation and Safety Measures

### Step 1.1: Create Legacy Directory Structure
```bash
mkdir -p legacy/gps-v1/{api,components,services,types,validators,scripts,db}
mkdir -p legacy/gps-v1/pages/{dashboard,debug,public,dev}
```

### Step 1.2: Move GPS Files to Legacy (Dry Run)
```bash
# Test the move operation without actually moving files
find src -name "*gps*" -o -name "*Gps*" -o -name "*GPS*" | head -10 | xargs -I {} echo "Would move: {} -> legacy/gps-v1/{}"
```

### Step 1.3: Identify External Dependencies
- [ ] Check for non-GPS components importing GPS modules
- [ ] Verify no external services depend on GPS APIs
- [ ] Confirm no third-party integrations use GPS data

## Phase 2: API Route Removal

### Step 2.1: Disable GPS API Endpoints
```bash
# Add maintenance mode to GPS API routes
echo "GPS system is being removed. Please contact support." > src/app/api/gps-reports/maintenance.txt
echo "GPS system is being removed. Please contact support." > src/app/api/gps-profiles/maintenance.txt
```

### Step 2.2: Remove GPS API Routes
**Files to Remove:**
- `src/app/api/gps-reports/route.ts`
- `src/app/api/gps-reports/[id]/route.ts`
- `src/app/api/gps-reports/[id]/process/route.ts`
- `src/app/api/gps-reports/recalculate/route.ts`
- `src/app/api/gps-reports/fix-canonical/route.ts`
- `src/app/api/gps-reports/extract-players/route.ts`
- `src/app/api/gps-reports/debug/route.ts`
- `src/app/api/gps-reports/diag/route.ts`
- `src/app/api/gps-reports/route-old.ts`
- `src/app/api/gps-profiles/route.ts`
- `src/app/api/gps-profiles/[id]/route.ts`
- `src/app/api/gps-profiles/[id]/usage/route.ts`
- `src/app/api/gps-profiles/templates/route.ts`
- `src/app/api/gps-profiles/parse-excel/route.ts`
- `src/app/api/gps-profiles/__tests__/profiles.canonical.test.ts`
- `src/app/api/public/gps-reports/[token]/route.ts`
- `src/app/api/debug/gps-reports/[id]/route.ts`
- `src/app/api/clean-gps-data/route.ts`
- `src/app/api/canonical/metrics/route.ts`

### Step 2.3: Update API Route Index
- [ ] Remove GPS routes from `src/app/api/route-config.ts`
- [ ] Update API documentation

## Phase 3: UI Component Removal

### Step 3.1: Remove GPS Pages
**Files to Remove:**
- `src/app/dashboard/fitness/gps-reports/page.tsx`
- `src/app/debug-gps/page.tsx`
- `src/app/clean-gps/page.tsx`
- `src/app/dev/gps-report/[id]/page.tsx`
- `src/app/public/gps-report/[token]/page.tsx`

### Step 3.2: Remove GPS Components
**Files to Remove:**
- `src/components/gps/UploadGpsReportModal.tsx`
- `src/components/gps/GpsReportTable.tsx`
- `src/components/gps/GpsReportModal.tsx`
- `src/components/gps/GpsReportsTab.tsx`
- `src/components/gps/GpsProfilesTab.tsx`
- `src/components/gps/CreateGpsProfileModal.tsx`
- `src/components/gps/EditGpsProfileModal.tsx`
- `src/components/gps/SimpleCreateGpsProfileModal.tsx`
- `src/components/gps/PlayerMappingModal.tsx`
- `src/components/gps/PlayerMappingsTab.tsx`
- `src/components/gps/PlayerTiles.tsx`
- `src/components/gps/GpsVisualization.tsx`
- `src/components/gps/GpsReportVisualization.tsx`
- `src/components/gps/RecalcCanonicalModal.tsx`
- `src/components/gps/CanonicalMetricSelector.tsx`
- `src/components/gps/__tests__/GpsReportTable.units.test.ts`

### Step 3.3: Update Navigation
**Files to Modify:**
- `src/components/layout/TopBar.tsx`
  - Remove GPS navigation items
  - Remove GPS-related active state logic
- `src/locales/ru/translation.json`
  - Remove GPS-related translation keys
- `src/locales/en/translation.json`
  - Remove GPS-related translation keys

## Phase 4: Service Layer Removal

### Step 4.1: Remove GPS Services
**Files to Remove:**
- `src/services/gps.service.ts`
- `src/services/gps.debug.ts`
- `src/services/gps/` (entire directory)
- `src/services/canon.mapper.ts`
- `src/services/canon.mapper.new.ts`
- `src/services/canon.mapper.old.ts`
- `src/services/__tests__/canon.mapper.test.ts`

### Step 4.2: Remove GPS Types and Validators
**Files to Remove:**
- `src/types/gps.ts`
- `src/validators/gpsUpload.schema.ts`
- `src/validators/gpsProfile.schema.ts`

### Step 4.3: Remove Canon System
**Files to Remove:**
- `src/canon/` (entire directory)

## Phase 5: Database Cleanup

### Step 5.1: Create Database Migration
```sql
-- Create migration file: drizzle/XXXX_remove_gps_system.sql

-- Step 1: Drop triggers
DROP TRIGGER IF EXISTS trigger_delete_gps_reports_on_match_delete ON "Match";
DROP TRIGGER IF EXISTS trigger_delete_gps_reports_on_training_delete ON "Training";
DROP FUNCTION IF EXISTS delete_gps_reports_on_match_delete();
DROP FUNCTION IF EXISTS delete_gps_reports_on_training_delete();

-- Step 2: Drop indexes
DROP INDEX IF EXISTS "gps_report_profile_id_idx";

-- Step 3: Drop tables
DROP TABLE IF EXISTS "GpsReport";
DROP TABLE IF EXISTS "GpsProfile";
DROP TABLE IF EXISTS "GpsMetric";
```

### Step 5.2: File Storage Cleanup
```bash
# Remove GPS report files
find public/uploads -name "gps-reports" -type d -exec rm -rf {} +
find . -name "*gps*" -type f -path "*/uploads/*" -delete
```

## Phase 6: Script and Test Cleanup

### Step 6.1: Remove GPS Scripts
**Files to Remove:**
- `scripts/gps/` (entire directory)
- `scripts/audit/canon-audit.ts`
- `scripts/canon/` (entire directory)
- `scripts/check-gps-*.cjs`
- `scripts/check-gps-*.js`
- `scripts/check-matches-gps.cjs`
- `scripts/clean-gps-reports.cjs`
- `scripts/fix-gps-reports.js`
- `scripts/gps-*.cjs`
- `scripts/reprocess-gps-report.cjs`

### Step 6.2: Remove GPS Tests
**Files to Remove:**
- `e2e/gps-*.spec.ts`
- All GPS-related test files in `src/__tests__/`

### Step 6.3: Remove GPS Documentation
**Files to Remove:**
- `docs/runbook/GPS_RUNBOOK.md`
- `docs/howto/ADD_NEW_GPS_SYSTEM.md`
- `docs/RELEASE_NOTES_GPS_P0.md`
- `docs/adr/ADR-0001-gps-canonical-snapshot.md`
- All GPS-related documentation files

## Phase 7: Final Cleanup

### Step 7.1: Remove GPS References
```bash
# Find and remove GPS references in remaining files
grep -r "gps\|GPS\|Gps" src --exclude-dir=node_modules | grep -v "legacy" | head -20
```

### Step 7.2: Update Package Dependencies
- [ ] Remove GPS-related dependencies from `package.json`
- [ ] Run `npm install` to clean up unused packages

### Step 7.3: Clean Up Build Artifacts
```bash
# Remove GPS-related build artifacts
rm -rf .next/types/app/*gps*
rm -rf .next/types/app/*Gps*
rm -rf .next/types/app/*GPS*
```

## Verification Steps

### After Each Phase:
1. [ ] Run `npm run build` to ensure no build errors
2. [ ] Run `npm run test` to ensure tests pass
3. [ ] Check for TypeScript errors
4. [ ] Verify no broken imports

### Final Verification:
1. [ ] Full application build succeeds
2. [ ] All tests pass
3. [ ] No GPS references in codebase (except legacy directory)
4. [ ] Database migration runs successfully
5. [ ] Application starts without errors
6. [ ] Navigation works correctly
7. [ ] No broken links or missing pages

## Rollback Plan

### If Issues Arise:
1. **Immediate Rollback:**
   - Restore files from legacy directory
   - Revert database migration
   - Restore navigation and translations

2. **Gradual Rollback:**
   - Re-enable feature flag
   - Restore GPS API endpoints
   - Restore GPS UI components

3. **Data Recovery:**
   - Restore from database backup
   - Restore file storage from backup
   - Re-import GPS data if needed

## Timeline Estimate

- **Phase 1 (Preparation):** 1-2 hours
- **Phase 2 (API Removal):** 2-3 hours
- **Phase 3 (UI Removal):** 3-4 hours
- **Phase 4 (Service Removal):** 2-3 hours
- **Phase 5 (Database Cleanup):** 1-2 hours
- **Phase 6 (Script Cleanup):** 1-2 hours
- **Phase 7 (Final Cleanup):** 1-2 hours

**Total Estimated Time:** 11-18 hours

## Risk Assessment

### High Risk:
- Database migration (data loss potential)
- File storage cleanup (data loss potential)
- Navigation changes (user experience impact)

### Medium Risk:
- API endpoint removal (integration impact)
- Component removal (UI functionality impact)

### Low Risk:
- Script removal (development impact only)
- Documentation removal (no functional impact)

## Success Criteria

1. ✅ All GPS functionality removed from application
2. ✅ No GPS references in codebase (except legacy directory)
3. ✅ Application builds and runs successfully
4. ✅ No broken functionality in remaining features
5. ✅ Database is clean and optimized
6. ✅ File storage is cleaned up
7. ✅ All tests pass
8. ✅ Documentation is updated
