import { pgTable, uuid, boolean, timestamp } from 'drizzle-orm/pg-core';
import { roleEnum } from './user.ts';
import { permission } from './permission.ts';

export const rolePermission = pgTable('RolePermission', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: roleEnum('role').notNull(), // строковое значение роли
  permissionId: uuid('permissionId').notNull().references(() => permission.id),
  allowed: boolean('allowed').notNull().default(true),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
}); 