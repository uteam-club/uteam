import { pgTable, uuid, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const mediaItem = pgTable('MediaItem', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  url: text('url').notNull(),
  size: integer('size').notNull(),
  description: text('description'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
  clubId: uuid('clubId').notNull(),
  eventId: uuid('eventId'),
  uploadedById: uuid('uploadedById').notNull(),
  exerciseId: uuid('exerciseId'),
  publicUrl: text('publicUrl'),
}); 