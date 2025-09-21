import { pgTable, uuid, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';

// GPS разрешения
export const gpsPermission = pgTable('GpsPermission', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 255 }).notNull().unique(), // e.g., 'gps.view', 'gps.edit', 'gps.profiles.create'
  name: varchar('name', { length: 255 }).notNull(), // e.g., 'Просмотр GPS отчетов'
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(), // e.g., 'reports', 'profiles', 'data'
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});

// Роли и GPS разрешения
export const gpsRolePermission = pgTable('GpsRolePermission', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: varchar('role', { length: 50 }).notNull(), // e.g., 'ADMIN', 'COACH'
  permissionId: uuid('permissionId').references(() => gpsPermission.id, { onDelete: 'cascade' }).notNull(),
  allowed: boolean('allowed').default(false).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});

// Пользовательские GPS разрешения (для конкретных команд)
export const gpsUserPermission = pgTable('GpsUserPermission', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId').notNull(), // Пользователь
  teamId: uuid('teamId'), // Команда (null = все команды клуба)
  clubId: uuid('clubId').notNull(), // Клуб
  
  // Права доступа
  canView: boolean('canView').default(false).notNull(), // Просмотр GPS данных
  canEdit: boolean('canEdit').default(false).notNull(), // Редактирование GPS данных
  canDelete: boolean('canDelete').default(false).notNull(), // Удаление GPS данных
  canExport: boolean('canExport').default(false).notNull(), // Экспорт GPS данных
  canManageProfiles: boolean('canManageProfiles').default(false).notNull(), // Управление профилями
  
  // Временные метки
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});