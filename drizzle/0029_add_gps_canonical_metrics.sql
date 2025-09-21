-- Create GpsCanonicalMetric table
CREATE TABLE IF NOT EXISTS "GpsCanonicalMetric" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"dimension" varchar(100) NOT NULL,
	"canonicalUnit" varchar(50) NOT NULL,
	"supportedUnits" jsonb,
	"isDerived" boolean DEFAULT false NOT NULL,
	"formula" text,
	"metadata" jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "GpsCanonicalMetric_code_unique" UNIQUE("code")
);

-- Create GpsUnit table
CREATE TABLE IF NOT EXISTS "GpsUnit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"dimension" varchar(100) NOT NULL,
	"conversionFactor" numeric(10,6) NOT NULL,
	"isCanonical" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "GpsUnit_code_unique" UNIQUE("code")
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "GpsCanonicalMetric_category_idx" ON "GpsCanonicalMetric" ("category");
CREATE INDEX IF NOT EXISTS "GpsCanonicalMetric_dimension_idx" ON "GpsCanonicalMetric" ("dimension");
CREATE INDEX IF NOT EXISTS "GpsCanonicalMetric_isActive_idx" ON "GpsCanonicalMetric" ("isActive");
CREATE INDEX IF NOT EXISTS "GpsUnit_dimension_idx" ON "GpsUnit" ("dimension");
CREATE INDEX IF NOT EXISTS "GpsUnit_isActive_idx" ON "GpsUnit" ("isActive");
