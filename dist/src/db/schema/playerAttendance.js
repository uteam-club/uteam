import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
export const playerAttendance = pgTable('PlayerAttendance', {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('playerId').notNull(),
    trainingId: uuid('trainingId').notNull(),
    status: varchar('status', { length: 20 }).default('TRAINED').notNull(),
    comment: text('comment'),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});
