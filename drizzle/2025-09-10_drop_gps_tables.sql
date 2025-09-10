-- Safe drop GPS tables (if exist). Postgres.
DO $$ BEGIN
  EXECUTE 'DROP TABLE IF EXISTS "GpsReport" CASCADE';
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  EXECUTE 'DROP TABLE IF EXISTS "GpsProfile" CASCADE';
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  EXECUTE 'DROP TABLE IF EXISTS "GpsMetric" CASCADE';
EXCEPTION WHEN undefined_table THEN NULL; END $$;
-- snake_case variants just in case
DO $$ BEGIN
  EXECUTE 'DROP TABLE IF EXISTS gps_reports CASCADE';
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  EXECUTE 'DROP TABLE IF EXISTS gps_profiles CASCADE';
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  EXECUTE 'DROP TABLE IF EXISTS gps_metrics CASCADE';
EXCEPTION WHEN undefined_table THEN NULL; END $$;
