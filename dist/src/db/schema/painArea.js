import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
export const painArea = pgTable('PainArea', {
    id: uuid('id').primaryKey().defaultRandom(),
    surveyId: uuid('surveyId').notNull(),
    areaName: varchar('areaName', { length: 255 }).notNull(),
    painLevel: integer('painLevel').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
});
