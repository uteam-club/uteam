import { pgTable, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';
export const team = pgTable('Team', {
    id: varchar('id', { length: 255 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
    clubId: varchar('clubId', { length: 255 }).notNull(),
    order: integer('order').default(999).notNull(),
    timezone: varchar('timezone', { length: 64 }).default('Europe/Moscow').notNull(),
});
