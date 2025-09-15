import { pgTable, uuid, varchar, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const gpsColumnMapping = pgTable('GpsColumnMapping', {
  id: uuid('id').primaryKey().defaultRandom(),
  gpsProfileId: uuid('gpsProfileId').notNull(),
  sourceColumn: varchar('sourceColumn', { length: 255 }).notNull(), // исходное название столбца
  customName: varchar('customName', { length: 255 }).notNull(), // кастомное название
  canonicalMetric: varchar('canonicalMetric', { length: 100 }).notNull(), // каноническая метрика
  displayUnit: varchar('displayUnit', { length: 50 }), // единица отображения (nullable)
  isVisible: boolean('isVisible').default(true).notNull(),
  displayOrder: integer('displayOrder').default(0).notNull(),
  description: text('description'), // описание столбца
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});
