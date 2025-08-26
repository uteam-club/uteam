import { pgTable, uuid, integer, timestamp } from 'drizzle-orm/pg-core';

export const rpeSurveyResponse = pgTable('RPESurveyResponse', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('playerId').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  readAt: timestamp('readAt', { withTimezone: true }),
  completedAt: timestamp('completedAt', { withTimezone: true }),
  rpeScore: integer('rpeScore').notNull(), // Оценка RPE от 1 до 10
  durationMinutes: integer('durationMinutes'), // Длительность тренировки в минутах
  surveyId: uuid('surveyId').notNull(),
  tenantId: uuid('tenantId').notNull(),
}); 