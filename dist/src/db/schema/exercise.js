import { pgTable, uuid, varchar, text, timestamp, doublePrecision } from 'drizzle-orm/pg-core';
export const exercise = pgTable('Exercise', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    authorId: uuid('authorId').notNull(),
    clubId: uuid('clubId').notNull(),
    categoryId: uuid('categoryId').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
    length: doublePrecision('length'),
    width: doublePrecision('width'),
});
