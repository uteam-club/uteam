# ADR-0001: GPS Canonical Layer & Snapshot-Driven Reports

**Status:** Accepted (2024-09-09)  
**Date:** 2024-09-09  
**Authors:** Lead Engineer  

## Context

The GPS module handles multi-vendor reports from different tracking systems (Polar, STATSports, B-SIGHT, etc.) with varying data formats, column names, and units. Previous implementation suffered from:

- **Vendor-specific code paths**: Hardcoded `if (gpsSystem === 'Polar')` conditions throughout the codebase
- **Magic array indices**: Direct access to CSV rows using `row[0]`, `row[1]` without header mapping
- **No snapshot preservation**: Reports lost their original column configuration when profiles were modified
- **Inconsistent units**: Mixed SI and non-SI units across different vendors
- **Fragile visualization**: UI components relied on "live" profile data instead of immutable snapshots

## Decision

We implement a **canonical layer with snapshot-driven reports**:

### 1. Canonical Metrics Registry
- **Single source of truth**: `src/canon/metrics.registry.json` defines all canonical metrics
- **SI units only**: All data converted to meters, seconds, m/s, etc.
- **Versioned**: `canonVersion` field tracks registry version used for each report
- **Unit conversion**: `src/canon/units.ts` handles km→m, km/h→m/s, %→ratio conversions

### 2. Profile-Driven Mapping
- **Header normalization**: `normalizeHeaders()` standardizes CSV headers (trim, lowercase, collapse spaces)
- **Profile-based mapping**: `applyProfile()` matches `sourceHeader` to `canonicalKey` using profile configuration
- **No vendor conditions**: Zero `if (gpsSystem === ...)` in runtime code
- **No magic indices**: All data access through header mapping

### 3. Snapshot-Driven Visualization
- **Immutable snapshots**: `profileSnapshot` preserves column configuration at import time
- **UI contracts**: Visualization components use `report.profileSnapshot.columns` exclusively
- **Display metadata**: `displayName`, `order`, `isVisible` from snapshot, not live profile
- **Backward compatibility**: Backfill procedure updates existing reports

### 4. Import Pipeline
```
parseSpreadsheet(file) 
  → normalizeHeaders(headers)
  → applyProfile(parsed, profile)
  → mapRowsToCanonical(data, columns)
  → buildProfileSnapshot(profile)
  → persist(report, snapshot, canonVersion)
```

## Consequences

### Positive
- **Vendor agnostic**: Adding new GPS systems requires only profile configuration
- **Stable reports**: Historical reports remain unchanged when profiles are modified
- **Consistent units**: All data in SI units for accurate comparison
- **Maintainable**: Clear separation of concerns, no vendor-specific code paths
- **Testable**: Each layer can be unit tested independently

### Negative
- **Profile complexity**: Profiles must be carefully configured with correct `canonicalKey` mappings
- **Backfill required**: Existing reports need snapshot restoration
- **Storage overhead**: `profileSnapshot` JSONB adds ~1-2KB per report
- **Migration complexity**: One-time backfill procedure for existing data

### Requirements
- **Profile validation**: `canonicalKey` must exist in metrics registry
- **Unique mapping**: No duplicate `canonicalKey` within a profile
- **Unit awareness**: Profile `unit` field should match canonical dimension
- **Snapshot completeness**: All visible columns must have valid mappings

## Operations

### Backfill Procedure
```bash
# Restore snapshots for reports with empty columns
npx tsx scripts/gps/backfill-empty-snapshot-columns.ts
```

### Development
- **Dev page**: `src/app/dev/gps-report/[id]` for local testing (production-blocked)
- **E2E tests**: Playwright tests verify snapshot-driven rendering
- **Unit tests**: Profile snapshot service and canonical mapping

### Monitoring
- **Readiness check**: `scripts/gps/readiness-check.ts` validates system health
- **CI pipeline**: Automated testing of canonical layer and snapshots

## Links

### Core Services
- `src/services/gps/profileSnapshot.service.ts` - Snapshot building
- `src/services/gps/ingest.service.ts` - Import pipeline
- `src/services/canon.mapper.ts` - Canonical data mapping
- `src/canon/metrics.registry.json` - Metrics definitions
- `src/canon/units.ts` - Unit conversions

### Tests
- `src/services/gps/__tests__/profileSnapshot.service.test.ts` - Unit tests
- `e2e/gps-report-dev.spec.ts` - E2E tests
- `scripts/gps/readiness-check.ts` - Health checks

### Database
- `public."GpsReport"` - Reports with `profileSnapshot` and `canonVersion`
- `public."GpsProfile"` - Profile configurations
- `idx_GpsReport_profileId` - Performance index

### Artifacts
- `artifacts/GPS_READINESS_SUMMARY.md` - System health report
- `artifacts/backfill-empty-snapshot-columns.log` - Backfill logs
- `artifacts/screens/` - E2E test screenshots

## Implementation Notes

This ADR represents a complete refactoring of the GPS module from vendor-specific to canonical architecture. The implementation includes:

1. **Zero breaking changes** to existing API contracts
2. **Backward compatibility** through backfill procedures
3. **Comprehensive testing** at unit, integration, and E2E levels
4. **Production safety** with dev-only pages and proper error handling

The canonical layer ensures data consistency and vendor independence while the snapshot system preserves historical report integrity.
