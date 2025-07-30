import { pgTable, uuid, varchar, real, timestamp, boolean, text } from 'drizzle-orm/pg-core';

export const playerMapping = pgTable('PlayerMapping', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Данные из отчета
  reportName: varchar('reportName', { length: 255 }).notNull(),
  gpsSystem: varchar('gpsSystem', { length: 100 }).notNull(),
  
  // Связь с игроком в приложении
  playerId: uuid('playerId').notNull(), // ID игрока в приложении
  teamId: uuid('teamId').notNull(), // ID команды
  
  // Метаданные
  confidenceScore: real('confidenceScore').notNull(), // Уверенность в сопоставлении (0-1)
  mappingType: varchar('mappingType', { length: 50 }).notNull(), // 'exact', 'fuzzy', 'manual', 'alias'
  notes: text('notes'), // Дополнительные заметки
  
  // Статус
  isActive: boolean('isActive').default(true).notNull(),
  
  // Временные метки
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
  
  // Мультитенантность
  clubId: uuid('clubId').notNull(),
  createdById: uuid('createdById').notNull(),
}); 