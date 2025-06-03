import { pgTable, uuid, integer, timestamp } from 'drizzle-orm/pg-core';

export const schedule = pgTable('Schedule', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('teamId').notNull(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
}); 