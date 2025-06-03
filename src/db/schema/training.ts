import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const training = pgTable('Training', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  date: timestamp('date', { withTimezone: true }).notNull(),
  location: varchar('location', { length: 255 }),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).default('SCHEDULED').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
  clubId: uuid('clubId').notNull(),
  teamId: uuid('teamId').notNull(),
  categoryId: uuid('categoryId').notNull(),
  createdById: uuid('createdById').notNull(),
  type: varchar('type', { length: 20 }).default('TRAINING').notNull(),
}); 