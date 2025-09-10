import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';

export const gpsReport = pgTable('GpsReport', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  fileName: varchar('fileName', { length: 255 }).notNull(),
  fileUrl: text('fileUrl').notNull(),
  fileSize: varchar('fileSize', { length: 50 }),
  gpsSystem: varchar('gpsSystem', { length: 100 }).notNull(), // B-SIGHT, Polar, etc.
  eventType: varchar('eventType', { length: 20 }).notNull(), // TRAINING, MATCH
  eventId: uuid('eventId').notNull(), // ID тренировки или матча
  teamId: uuid('teamId').notNull(), // ID команды
  profileId: uuid('profileId').notNull(), // ID профиля визуализации
  profileSnapshot: jsonb('profileSnapshot'), // Снапшот профиля на момент импорта
  canonVersion: text('canonVersion'), // Версия канонического реестра
  rawData: jsonb('rawData'), // Сырые данные из Excel/CSV
  processedData: jsonb('processedData'), // Обработанные данные с кастомными формулами
  metadata: jsonb('metadata'), // Дополнительные метаданные
  importMeta: jsonb('importMeta').notNull().default('{}'), // Метаданные импорта
  isProcessed: boolean('isProcessed').default(false).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
  clubId: uuid('clubId').notNull(),
  uploadedById: uuid('uploadedById').notNull(),
}, (table) => ({
  profileIdIdx: index('gps_report_profile_id_idx').on(table.profileId),
})); 