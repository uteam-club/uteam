import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const permission = pgTable('Permission', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 64 }).notNull().unique(), // например, 'view_users'
  description: text('description'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
}); 