# GPS Database Schema and Migrations Audit

## Database Tables

### 1. GpsReport Table
**File:** `src/db/schema/gpsReport.ts`
**Table Name:** `GpsReport`

#### Columns:
- `id` (uuid, primary key) - Unique identifier
- `name` (varchar(255)) - Report name
- `fileName` (varchar(255)) - Original file name
- `fileUrl` (text) - File storage URL
- `fileSize` (varchar(50)) - File size
- `gpsSystem` (varchar(100)) - GPS system type (B-SIGHT, Polar, etc.)
- `eventType` (varchar(20)) - Event type (TRAINING, MATCH)
- `eventId` (uuid) - ID of training or match
- `teamId` (uuid) - Team ID
- `profileId` (uuid) - Visualization profile ID
- `profileSnapshot` (jsonb) - Profile snapshot at import time
- `canonVersion` (text) - Canonical registry version
- `rawData` (jsonb) - Raw data from Excel/CSV
- `processedData` (jsonb) - Processed data with custom formulas
- `metadata` (jsonb) - Additional metadata
- `importMeta` (jsonb) - Import metadata (default: '{}')
- `isProcessed` (boolean) - Processing status (default: false)
- `createdAt` (timestamp) - Creation timestamp
- `updatedAt` (timestamp) - Update timestamp
- `clubId` (uuid) - Club ID
- `uploadedById` (uuid) - Uploader user ID

#### Indexes:
- `gps_report_profile_id_idx` - Index on profileId for faster lookups

### 2. GpsProfile Table
**File:** `src/db/schema/gpsProfile.ts`
**Table Name:** `GpsProfile`

#### Columns:
- `id` (uuid, primary key) - Unique identifier
- `name` (varchar(255)) - Profile name
- `description` (text) - Profile description
- `gpsSystem` (varchar(100)) - GPS system type
- `isDefault` (boolean) - Default profile flag (default: false)
- `isActive` (boolean) - Active status (default: true)
- `visualizationConfig` (jsonb) - Chart and diagram configuration
- `metricsConfig` (jsonb) - Metrics display settings
- `customFormulas` (jsonb) - Custom calculation formulas
- `columnMapping` (jsonb) - Excel column to internal field mapping
- `dataFilters` (jsonb) - Data processing filters
- `createdAt` (timestamp) - Creation timestamp
- `updatedAt` (timestamp) - Update timestamp
- `clubId` (uuid) - Club ID
- `createdById` (uuid) - Creator user ID

### 3. GpsMetric Table
**File:** `src/db/schema/gpsMetric.ts`
**Table Name:** `GpsMetric`

#### Columns:
- `id` (uuid, primary key) - Unique identifier
- `name` (varchar(255)) - Metric name
- `displayName` (varchar(255)) - Display name
- `description` (text) - Metric description
- `unit` (varchar(50)) - Unit (km/h, m/min, etc.)
- `dataType` (varchar(50)) - Data type (number, string, boolean)
- `isVisible` (boolean) - Visibility flag (default: true)
- `isCustom` (boolean) - Custom metric flag (default: false)
- `order` (integer) - Display order (default: 0)
- `formula` (text) - JavaScript formula for custom metrics
- `sourceMetrics` (jsonb) - Source metrics IDs for formulas
- `chartType` (varchar(50)) - Chart type (line, bar, pie)
- `color` (varchar(7)) - HEX color
- `minValue` (jsonb) - Minimum value
- `maxValue` (jsonb) - Maximum value
- `createdAt` (timestamp) - Creation timestamp
- `updatedAt` (timestamp) - Update timestamp
- `clubId` (uuid) - Club ID
- `createdById` (uuid) - Creator user ID

## Database Migrations

### GPS-Related Migrations:

#### 1. 0016_add_cascade_delete_gps_reports.sql
**Purpose:** Add cascade deletion for GPS reports when matches/trainings are deleted

**Functions Created:**
- `delete_gps_reports_on_match_delete()` - Deletes GPS reports when match is deleted
- `delete_gps_reports_on_training_delete()` - Deletes GPS reports when training is deleted

**Triggers Created:**
- `trigger_delete_gps_reports_on_match_delete` on `Match` table
- `trigger_delete_gps_reports_on_training_delete` on `Training` table

#### 2. 0025_add_profile_snapshot_to_gps_report.sql
**Purpose:** Add profile snapshot column to GPS reports

**Changes:**
- Added `profileSnapshot` jsonb column to `GpsReport` table
- Added `importMeta` jsonb column with default '{}'
- Created index `gps_report_profile_id_idx` on `profileId`

#### 3. 0025_gps_snapshot_safe.sql
**Purpose:** Safe migration for GPS snapshot functionality

**Changes:**
- Added `profileSnapshot` jsonb column (nullable)
- Added `importMeta` jsonb column with default '{}'
- Created index `gps_report_profile_id_idx` on `profileId`

#### 4. 1757437762_gps_snapshot_safe.sql
**Purpose:** Additional GPS snapshot migration

## Foreign Key Relationships

### GpsReport Table:
- `eventId` → `Match.id` or `Training.id` (via cascade delete triggers)
- `teamId` → `Team.id`
- `profileId` → `GpsProfile.id`
- `clubId` → `Club.id`
- `uploadedById` → `User.id`

### GpsProfile Table:
- `clubId` → `Club.id`
- `createdById` → `User.id`

### GpsMetric Table:
- `clubId` → `Club.id`
- `createdById` → `User.id`

## Data Dependencies

### External References to GPS Tables:

1. **Match/Training Deletion:**
   - Triggers automatically delete GPS reports when matches/trainings are deleted
   - Ensures data consistency

2. **User Management:**
   - GPS reports are tied to users who uploaded them
   - GPS profiles are tied to users who created them

3. **Club Management:**
   - All GPS data is scoped to clubs
   - Club deletion would require GPS data cleanup

## Data Volume Estimates

Based on the schema analysis:
- **GpsReport:** ~25 columns, mostly JSONB (large storage footprint)
- **GpsProfile:** ~15 columns, mostly JSONB
- **GpsMetric:** ~20 columns, mixed types

## Migration Safety

### Safe to Delete:
- All GPS tables can be safely deleted if no external references exist
- Cascade delete triggers ensure referential integrity
- No foreign key constraints from external tables

### Potential Issues:
- Large JSONB columns may impact performance during deletion
- File storage cleanup required (fileUrl references)
- Cache invalidation needed for related UI components

## Cleanup Recommendations

### Before Deletion:
1. **Backup Data:**
   ```sql
   -- Create backup tables
   CREATE TABLE gps_report_backup AS SELECT * FROM "GpsReport";
   CREATE TABLE gps_profile_backup AS SELECT * FROM "GpsProfile";
   CREATE TABLE gps_metric_backup AS SELECT * FROM "GpsMetric";
   ```

2. **File Storage Cleanup:**
   - Remove all files referenced in `fileUrl` columns
   - Clean up `/gps-reports/{clubId}/` directories

3. **Cache Invalidation:**
   - Clear GPS-related cache entries
   - Invalidate UI components

### Deletion Order:
1. Drop triggers first
2. Delete GpsReport (largest table)
3. Delete GpsProfile
4. Delete GpsMetric
5. Clean up file storage

### Migration Script:
```sql
-- Step 1: Drop triggers
DROP TRIGGER IF EXISTS trigger_delete_gps_reports_on_match_delete ON "Match";
DROP TRIGGER IF EXISTS trigger_delete_gps_reports_on_training_delete ON "Training";
DROP FUNCTION IF EXISTS delete_gps_reports_on_match_delete();
DROP FUNCTION IF EXISTS delete_gps_reports_on_training_delete();

-- Step 2: Drop tables
DROP TABLE IF EXISTS "GpsReport";
DROP TABLE IF EXISTS "GpsProfile";
DROP TABLE IF EXISTS "GpsMetric";
```
