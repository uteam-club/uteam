import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';

export const gpsReportData = pgTable('GpsReportData', {
  id: uuid('id').primaryKey().defaultRandom(),
  gpsReportId: uuid('gpsReportId').notNull(),
  playerId: uuid('playerId').notNull(),
  canonicalMetric: varchar('canonicalMetric', { length: 100 }).notNull(),
  value: text('value').notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
});
