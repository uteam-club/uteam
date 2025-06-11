import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';

export const survey = pgTable('Survey', {
  id: varchar('id', { length: 255 }).primaryKey(),
  tenantId: varchar('tenantId', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
}); 