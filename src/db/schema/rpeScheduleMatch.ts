import { pgTable, uuid, varchar, time, timestamp, text } from 'drizzle-orm/pg-core';

export const rpeScheduleMatch = pgTable('RPEScheduleMatch', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('matchId').notNull(),
  teamId: uuid('teamId').notNull(),
  scheduledTime: time('scheduledTime').notNull(),
  status: varchar('status', { length: 20 }).default('scheduled').notNull(),
  recipientsConfig: text('recipientsConfig'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
  sentAt: timestamp('sentAt', { withTimezone: true }),
  createdById: uuid('createdById').notNull(),
});


