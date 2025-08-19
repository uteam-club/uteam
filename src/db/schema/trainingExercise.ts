import { pgTable, uuid, integer, text, timestamp } from 'drizzle-orm/pg-core';

export const trainingExercise = pgTable('TrainingExercise', {
  id: uuid('id').primaryKey().defaultRandom(),
  position: integer('position').notNull(),
  trainingId: uuid('trainingId').notNull(),
  exerciseId: uuid('exerciseId').notNull(),
  notes: text('notes'),
  // Поля для таймингов упражнения
  series: integer('series'), // количество серий
  repetitions: integer('repetitions'), // количество повторов в серии
  repetitionTime: integer('repetitionTime'), // время выполнения повтора (в секундах)
  pauseBetweenRepetitions: integer('pauseBetweenRepetitions'), // пауза между повторами (в секундах)
  pauseBetweenSeries: integer('pauseBetweenSeries'), // пауза между сериями (в секундах)
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
}); 