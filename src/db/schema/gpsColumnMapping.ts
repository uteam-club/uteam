import { pgTable, uuid, varchar, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { gpsCanonicalMetric } from './gpsCanonicalMetric';

export const gpsColumnMapping = pgTable('GpsColumnMapping', {
  id: uuid('id').primaryKey().defaultRandom(),
  gpsProfileId: uuid('gpsProfileId').notNull(),
  sourceColumn: varchar('sourceColumn', { length: 255 }).notNull(),
  customName: varchar('customName', { length: 255 }).notNull(),
  canonicalMetric: varchar('canonicalMetric', { length: 100 }).notNull(),
  isVisible: boolean('isVisible').default(true).notNull(),
  displayOrder: integer('displayOrder').default(0).notNull(),
  description: text('description'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
  displayUnit: varchar('displayUnit', { length: 50 }),
  sourceUnit: varchar('sourceUnit', { length: 50 }),
  clubId: uuid('clubId').notNull(),
  teamId: uuid('teamId').notNull(),
});

export const gpsVisualizationProfile = pgTable('GpsVisualizationProfile', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  clubId: uuid('clubId').notNull(),
  createdById: uuid('createdById').notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});

export const gpsProfileColumn = pgTable('GpsProfileColumn', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profileId').references(() => gpsVisualizationProfile.id, { onDelete: 'cascade' }).notNull(),
  canonicalMetricId: uuid('canonicalMetricId').references(() => gpsCanonicalMetric.id, { onDelete: 'cascade' }).notNull(),
  displayName: varchar('displayName', { length: 255 }).notNull(),
  displayUnit: varchar('displayUnit', { length: 50 }).notNull(),
  displayOrder: integer('displayOrder').notNull(),
  isVisible: boolean('isVisible').default(true).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});

// Удалена таблица gpsProfileTeam - профили больше не привязаны к командам