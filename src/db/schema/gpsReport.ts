import { pgTable, uuid, varchar, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const gpsReport = pgTable('GpsReport', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  fileName: varchar('fileName', { length: 255 }).notNull(),
  fileUrl: text('fileUrl').notNull(),
  filePath: text('filePath'), // дополнительное поле для совместимости
  fileSize: integer('fileSize'), // размер файла в байтах
  gpsSystem: varchar('gpsSystem', { length: 100 }).notNull(),
  eventType: varchar('eventType', { length: 50 }).notNull(), // 'training' или 'match'
  eventId: uuid('eventId').notNull(), // ID тренировки или матча
  profileId: uuid('profileId'), // ID GPS профиля (может быть null)
  gpsProfileId: uuid('gpsProfileId'), // дополнительное поле для совместимости
  trainingId: uuid('trainingId'), // дополнительное поле для совместимости
  matchId: uuid('matchId'), // дополнительное поле для совместимости
  rawData: jsonb('rawData'), // сырые данные из файла
  processedData: jsonb('processedData'), // обработанные данные
  metadata: jsonb('metadata'), // метаданные
  isProcessed: boolean('isProcessed').notNull().default(false),
  status: varchar('status', { length: 50 }).default('uploaded').notNull() as any, // uploaded, processed, error
  processedAt: timestamp('processedAt', { withTimezone: true }),
  errorMessage: text('errorMessage'),
  ingestStatus: varchar('ingestStatus', { length: 50 }).notNull().default('pending') as any, // pending, processing, completed, failed
  ingestError: text('ingestError'),
  profileSnapshot: jsonb('profileSnapshot'), // снимок профиля на момент загрузки
  canonVersion: text('canonVersion'), // версия канонических метрик
  importMeta: jsonb('importMeta'), // метаданные импорта
  clubId: uuid('clubId').notNull(),
  uploadedById: uuid('uploadedById').notNull(),
  teamId: uuid('teamId').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});
