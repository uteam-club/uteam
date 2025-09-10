# GPS P0 Foundation — snapshot-driven, vendor-agnostic ingest

## 🎯 GPS P0 Foundation Release

### Key Changes
- **Snapshot-driven visualization**: Reports now use immutable `profileSnapshot` for column configuration
- **Canonical SI layer**: All data converted to SI units with `canonVersion` tracking
- **Clean ingest pipeline**: No vendor-specific conditions or magic array indices
- **Backfill support**: Existing reports updated with snapshot data
- **E2E testing**: Playwright tests for Polar/STATSports reports
- **Readiness check**: 9/9 PASS score for production readiness

### Database Changes
- Added `profileSnapshot` (JSONB), `canonVersion` (TEXT), `importMeta` (JSONB) to GpsReport
- Added index on `profileId` for performance
- Safe migration with `ADD COLUMN IF NOT EXISTS` (no data loss risk)

### New Scripts
- `npm run gps:seed:demo` - Create demo data
- `npm run gps:import:demo` - Import demo reports  
- `npm run gps:verify:demo` - Verify data integrity
- `tsx scripts/gps/readiness-check.ts` - Production readiness check
- `tsx scripts/gps/prune-empty-reports.ts` - Cleanup empty reports

### Testing
- Unit tests for `buildProfileSnapshot` service
- E2E tests with Playwright (Polar/STATSports scenarios)
- Dev page with NODE_ENV guard (production-safe)

### Artifacts
- `artifacts/GPS_READINESS_SUMMARY.md` - Readiness report (9/9 PASS)
- `artifacts/screens/` - E2E test screenshots
- `docs/adr/ADR-0001-gps-canonical-snapshot.md` - Architecture decision record

### Deploy Checklist
- [ ] Create database backup
- [ ] Deploy changes
- [ ] Run readiness check (expect 9/9)
- [ ] Import demo reports and verify visualization
- [ ] Enable monitoring/alerts

**Ready for production deployment with 100% readiness score! 🚀**

---

**Branch**: `fix/gps-safety-and-canon` → `main`  
**Commit**: `d6ea0b8`  
**Files changed**: 107 files, +6638 insertions, -510 deletions
