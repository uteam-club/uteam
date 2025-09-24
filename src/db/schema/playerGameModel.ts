import { pgTable, uuid, varchar, text, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core';

export const playerGameModel = pgTable('PlayerGameModel', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('playerId').notNull(),
  clubId: uuid('clubId').notNull(),
  calculatedAt: timestamp('calculatedAt', { withTimezone: true }).defaultNow().notNull(),
  matchesCount: integer('matchesCount').notNull(), // количество матчей (до 10)
  totalMinutes: integer('totalMinutes').notNull(), // общее время игры
  metrics: jsonb('metrics').notNull(), // нормализованные метрики за 1 минуту
  matchIds: jsonb('matchIds').notNull(), // ID матчей, которые использовались
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});

export const playerGameModelSettings = pgTable('PlayerGameModelSettings', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('playerId').notNull(),
  clubId: uuid('clubId').notNull(),
  selectedMetrics: jsonb('selectedMetrics').notNull(), // выбранные метрики для отображения
  metricUnits: jsonb('metricUnits').notNull(), // единицы измерения для каждой метрики
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});


