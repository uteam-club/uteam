import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const trainingCategory = pgTable('TrainingCategory', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
  clubId: uuid('clubId').notNull(),
}); 