import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, decimal } from 'drizzle-orm/pg-core';

export const gpsCanonicalMetric = pgTable('GpsCanonicalMetric', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  dimension: varchar('dimension', { length: 100 }).notNull(),
  canonicalUnit: varchar('canonicalUnit', { length: 50 }).notNull(),
  supportedUnits: jsonb('supportedUnits'),
  isDerived: boolean('isDerived').default(false).notNull(),
  formula: text('formula'),
  metadata: jsonb('metadata'),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});

export const gpsUnit = pgTable('GpsUnit', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  dimension: varchar('dimension', { length: 100 }).notNull(),
  conversionFactor: decimal('conversionFactor', { precision: 10, scale: 6 }).notNull(),
  isCanonical: boolean('isCanonical').default(false).notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});