import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
export const event = pgTable('Event', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    startDate: timestamp('startDate', { withTimezone: true }).notNull(),
    endDate: timestamp('endDate', { withTimezone: true }),
    location: varchar('location', { length: 255 }),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
    clubId: uuid('clubId').notNull(),
    teamId: uuid('teamId'),
    createdById: uuid('createdById').notNull(),
});
