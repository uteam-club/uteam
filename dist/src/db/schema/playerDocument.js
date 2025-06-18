import { pgTable, uuid, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';
export const playerDocument = pgTable('PlayerDocument', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    url: text('url').notNull(),
    publicUrl: text('publicUrl'),
    size: integer('size').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
    playerId: uuid('playerId').notNull(),
    clubId: uuid('clubId').notNull(),
    uploadedById: uuid('uploadedById').notNull(),
});
