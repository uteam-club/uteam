import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer } from 'drizzle-orm/pg-core';

export const gpsMetric = pgTable('GpsMetric', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  displayName: varchar('displayName', { length: 255 }).notNull(),
  description: text('description'),
  unit: varchar('unit', { length: 50 }), // км/ч, м/мин, и т.д.
  dataType: varchar('dataType', { length: 50 }).notNull(), // number, string, boolean, etc.
  
  // Настройки отображения
  isVisible: boolean('isVisible').default(true).notNull(),
  isCustom: boolean('isCustom').default(false).notNull(), // Кастомная метрика
  order: integer('order').default(0).notNull(),
  
  // Формула для кастомных метрик
  formula: text('formula'), // JavaScript формула для вычисления
  sourceMetrics: jsonb('sourceMetrics'), // Массив ID метрик-источников для формулы
  
  // Настройки визуализации
  chartType: varchar('chartType', { length: 50 }), // line, bar, pie, etc.
  color: varchar('color', { length: 7 }), // HEX цвет
  minValue: jsonb('minValue'),
  maxValue: jsonb('maxValue'),
  
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
  clubId: uuid('clubId').notNull(),
  createdById: uuid('createdById').notNull(),
}); 