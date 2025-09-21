import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const gpsReportData = pgTable('GpsReportData', {
  id: uuid('id').primaryKey().defaultRandom(),
  gpsReportId: uuid('gpsReportId').notNull(),
  playerId: uuid('playerId').notNull(),
  canonicalMetric: varchar('canonicalMetric', { length: 100 }).notNull(),
  value: text('value').notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
});

export const gpsDataChangeLog = pgTable('GpsDataChangeLog', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportDataId: uuid('reportDataId').notNull(),
  reportId: uuid('reportId').notNull(),
  playerId: uuid('playerId').notNull(),
  clubId: uuid('clubId').notNull(),
  fieldName: varchar('fieldName', { length: 100 }).notNull(),
  fieldLabel: varchar('fieldLabel', { length: 255 }).notNull(),
  oldValue: text('oldValue'),
  newValue: text('newValue').notNull(),
  changedById: uuid('changedById').notNull(),
  changedByName: varchar('changedByName', { length: 255 }).notNull(),
  changedAt: timestamp('changedAt', { withTimezone: true }).defaultNow().notNull(),
  changeReason: text('changeReason'),
  changeType: varchar('changeType', { length: 50 }).default('manual').notNull(),
});