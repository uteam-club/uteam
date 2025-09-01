import { pgTable, uuid, varchar, boolean, timestamp, text } from 'drizzle-orm/pg-core';

// Типы для конфигурации получателей
export interface RecipientsConfig {
  isIndividualMode: boolean;
  selectedPlayerIds: string[] | null;
  updatedAt: string;
}

export const surveySchedule = pgTable('SurveySchedule', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('teamId').notNull(),
  surveyType: varchar('surveyType', { length: 32 }).notNull().default('morning'),
  enabled: boolean('enabled').notNull().default(true),
  sendTime: varchar('sendTime', { length: 8 }).notNull().default('08:00'),
  recipientsConfig: text('recipientsConfig'), // JSON конфигурация получателей
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow(),
}); 