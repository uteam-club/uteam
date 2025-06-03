import { pgTable, uuid, integer, text, timestamp } from 'drizzle-orm/pg-core';

export const trainingExercise = pgTable('TrainingExercise', {
  id: uuid('id').primaryKey().defaultRandom(),
  position: integer('position').notNull(),
  trainingId: uuid('trainingId').notNull(),
  exerciseId: uuid('exerciseId').notNull(),
  notes: text('notes'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
}); 