import { pgTable, uuid, timestamp, integer, boolean, uniqueIndex } from 'drizzle-orm/pg-core';

export const gpsPlayerMapping = pgTable('GpsPlayerMapping', {
  id: uuid('id').primaryKey().defaultRandom(),
  gpsReportId: uuid('gpsReportId').notNull(),
  playerId: uuid('playerId'), // nullable для "Без привязки"
  rowIndex: integer('rowIndex').notNull(), // индекс строки в отчете
  isManual: boolean('isManual').default(false).notNull(),
  similarity: integer('similarity'), // nullable, процент сходства
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Уникальный индекс для предотвращения дублирования маппингов
  reportRowUnique: uniqueIndex('gps_player_mapping_report_row_unique').on(table.gpsReportId, table.rowIndex),
}));
