# GPS Recovery Dry-Run Report

## Summary

| Metric | Count |
|--------|-------|
| Orphan reports | 16 |
| Recovery ready | 16 |
| With issues | 1 types |

## Issues by Type

| Issue | Count |
|-------|-------|
| UNKNOWN_KEYS | 10 |

## By Profile ID (Top 10)

| Profile ID | Reports | Recovery Ready |
|------------|---------|----------------|
| d257469f-58b8-49e2-b4dc-7361329ae412 | 16 | 16 |

## Example Recovery-Ready Reports

| Report ID | Profile ID | Columns | Sample Columns | Issues |
|-----------|------------|---------|----------------|--------|
| 5f4a16ee-b3b9-4b85-b87e-9bb0272a3da2 | d257469f-58b8-49e2-b4dc-7361329ae412 | 14 | 0, 1, 2, 3, 4 | None |
| d81f08a2-e4e0-4cde-a8c2-87cc978e2ec1 | d257469f-58b8-49e2-b4dc-7361329ae412 | 14 | 0, 1, 2, 3, 4 | None |
| 225794f5-143b-448b-a872-53b92c997d40 | d257469f-58b8-49e2-b4dc-7361329ae412 | 14 | 0, 1, 2, 3, 4 | None |
| 18590fb0-817f-4cea-bf54-067570c77fb6 | d257469f-58b8-49e2-b4dc-7361329ae412 | 14 | 0, 1, 2, 3, 4 | None |
| c5b4c12e-4722-453b-a52d-aa3c09bbf62e | d257469f-58b8-49e2-b4dc-7361329ae412 | 14 | 0, 1, 2, 3, 4 | None |

## Notes

- All orphan reports (profileSnapshot IS NULL AND profile NOT EXISTS) have been analyzed
- No database writes were performed (DRY-RUN mode)
- Canon version: 1.0.1
- Generated: 2025-09-09T17:39:05.631Z
