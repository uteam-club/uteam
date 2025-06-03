import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const teamCoach = pgTable('TeamCoach', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('teamId').notNull(),
  userId: uuid('userId').notNull(),
  role: varchar('role', { length: 255 }),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
}); 