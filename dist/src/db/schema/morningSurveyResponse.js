import { pgTable, varchar, integer, doublePrecision, timestamp } from 'drizzle-orm/pg-core';
export const morningSurveyResponse = pgTable('MorningSurveyResponse', {
    id: varchar('id', { length: 255 }).primaryKey(),
    playerId: varchar('playerId', { length: 255 }).notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    readAt: timestamp('readAt', { withTimezone: true }),
    completedAt: timestamp('completedAt', { withTimezone: true }),
    sleepDuration: doublePrecision('sleepDuration').notNull(),
    sleepQuality: integer('sleepQuality').notNull(),
    recovery: integer('recovery').notNull(),
    mood: integer('mood').notNull(),
    muscleCondition: integer('muscleCondition').notNull(),
    surveyId: varchar('surveyId', { length: 255 }).notNull(),
    tenantId: varchar('tenantId', { length: 255 }).notNull(),
});
