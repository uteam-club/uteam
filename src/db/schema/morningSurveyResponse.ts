import { pgTable, uuid, varchar, integer, doublePrecision, timestamp } from 'drizzle-orm/pg-core';

export const morningSurveyResponse = pgTable('MorningSurveyResponse', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('playerId').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  readAt: timestamp('readAt', { withTimezone: true }),
  completedAt: timestamp('completedAt', { withTimezone: true }),
  sleepDuration: doublePrecision('sleepDuration').notNull(),
  sleepQuality: integer('sleepQuality').notNull(),
  recovery: integer('recovery').notNull(),
  mood: integer('mood').notNull(),
  muscleCondition: integer('muscleCondition').notNull(),
  surveyId: uuid('surveyId').notNull(),
  tenantId: uuid('tenantId').notNull(),
}); 