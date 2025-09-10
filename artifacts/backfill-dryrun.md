# GPS Backfill Dry-Run Report

## Summary

| Metric | Count |
|--------|-------|
| Total reports | 18 |
| Missing snapshot | 18 |
| Can backfill | 2 |
| With issues | 16 |

## Top Issues

| Issue | Count |
|-------|-------|
| PROFILE_NOT_FOUND | 16 |

## By Profile ID (Top 10)

| Profile ID | Reports | Issues |
|------------|---------|--------|
| d257469f-58b8-49e2-b4dc-7361329ae412 | 16 | 16 |
| b2e899a8-d2b3-49bd-80d1-f77860da504f | 2 | 0 |

## Example Reports for Backfill

| Report ID | Profile ID | Columns | Issues |
|-----------|------------|---------|--------|
| c73d831f-52ae-4e35-a7d5-097a4b32db54 | b2e899a8-d2b3-49bd-80d1-f77860da504f | 5 | None |
| 77203524-a72e-4dda-9e8d-696e35d9b4d5 | b2e899a8-d2b3-49bd-80d1-f77860da504f | 5 | None |

## Notes

- All reports with NULL profileSnapshot have been analyzed
- No database writes were performed (DRY-RUN mode)
- Canon version: 1.0.1
- Generated: 2025-09-09T17:34:22.213Z
