import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

export const gpsProfile = pgTable('GpsProfile', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  gpsSystem: varchar('gpsSystem', { length: 100 }).notNull(), // B-SIGHT, Polar, etc.
  isDefault: boolean('isDefault').default(false).notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  
  // Настройки визуализации
  visualizationConfig: jsonb('visualizationConfig').notNull(), // Конфигурация графиков и диаграмм
  metricsConfig: jsonb('metricsConfig').notNull(), // Настройки метрик для отображения
  customFormulas: jsonb('customFormulas'), // Кастомные формулы для вычисления метрик
  
  // Настройки парсинга
  columnMapping: jsonb('columnMapping').notNull(), // Маппинг колонок Excel на внутренние поля
  dataFilters: jsonb('dataFilters'), // Фильтры для обработки данных
  
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
  clubId: uuid('clubId').notNull(),
  createdById: uuid('createdById').notNull(),
}); 