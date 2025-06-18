import { pgTable, uuid, integer, varchar, timestamp } from 'drizzle-orm/pg-core';
export const muscleArea = pgTable('MuscleArea', {
    id: uuid('id').primaryKey().defaultRandom(),
    number: integer('number').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    view: varchar('view', { length: 50 }).notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});
