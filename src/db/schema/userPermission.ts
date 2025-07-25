import { pgTable, uuid, boolean, timestamp } from 'drizzle-orm/pg-core';
import { user } from './user';
import { permission } from './permission';

export const userPermission = pgTable('UserPermission', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId').notNull().references(() => user.id),
  permissionId: uuid('permissionId').notNull().references(() => permission.id),
  allowed: boolean('allowed').notNull(), // true = разрешено, false = запрещено
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
}); 