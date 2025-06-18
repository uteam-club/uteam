import { pgTable, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
export const surveySchedule = pgTable('SurveySchedule', {
    id: varchar('id', { length: 255 }).primaryKey(),
    teamId: varchar('teamId', { length: 255 }).notNull(),
    surveyType: varchar('surveyType', { length: 32 }).notNull().default('morning'),
    enabled: boolean('enabled').notNull().default(true),
    sendTime: varchar('sendTime', { length: 8 }).notNull().default('08:00'),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow(),
});
