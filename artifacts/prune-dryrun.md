# GPS Prune Dry-Run Report

## Summary

### Reports by Category

| Category | Count | Sample IDs |
|----------|-------|------------|
| R1 | 16 | 5f4a16ee-b3b9-4b85-b87e-9bb0272a3da2, d81f08a2-e4e0-4cde-a8c2-87cc978e2ec1, 225794f5-143b-448b-a872-53b92c997d40... |
| R2 | 0 |  |
| R3 | 0 |  |
| R4 | 0 |  |
| R5 | 0 |  |

### Profiles by Category

| Category | Count | Sample IDs |
|----------|-------|------------|
| P1 | 0 |  |
| P2 | 0 |  |
| removable_after_reports | 0 |  |

## Age Distribution

| >365 days | 180-365 days | 90-180 days | <90 days |
|-----------|--------------|-------------|----------|
| 0 | 0 | 0 | 18 |

## Size Estimate

| Data Type | Size |
|-----------|------|
| Raw Data | 0 MB |
| Processed Data | 0 MB |

## Foreign Key Dependencies

| Table | FK Count | Rules |
|-------|----------|-------|
| GpsReport | 0 | N/A |
| GpsProfile | 0 | N/A |

## Risks and Dependencies

- **No CASCADE deletes detected**: Manual cleanup required
- **Orphan reports**: 16 reports without profiles
- **Unprocessed stale**: 0 reports older than 14 days and not processed
- **Very old data**: 0 reports older than 365 days

## Notes

- All analysis performed in DRY-RUN mode (no data modified)
- Generated: 2025-09-09T17:50:42.897Z
- SQL scripts prepared for safe batch deletion
