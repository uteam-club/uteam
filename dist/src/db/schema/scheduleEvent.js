import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
export const scheduleEvent = pgTable('ScheduleEvent', {
    id: uuid('id').primaryKey().defaultRandom(),
    scheduleId: uuid('scheduleId').notNull(),
    type: varchar('type', { length: 50 }).default('TRAINING').notNull(),
    time: varchar('time', { length: 10 }).notNull(),
    description: text('description').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});
