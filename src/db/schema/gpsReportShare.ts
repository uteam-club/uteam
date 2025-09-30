import { pgTable, uuid, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

export const gpsReportShare = pgTable('GpsReportShare', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('reportId').notNull(),
  profileId: uuid('profileId').notNull(),
  createdById: uuid('createdById').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revokedAt', { withTimezone: true }),
  views: integer('views').default(0).notNull(),
  lastViewedAt: timestamp('lastViewedAt', { withTimezone: true }),
  options: jsonb('options'),
});


