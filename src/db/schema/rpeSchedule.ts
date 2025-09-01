import { pgTable, uuid, varchar, time, timestamp, text } from 'drizzle-orm/pg-core';

export const rpeSchedule = pgTable('RPESchedule', {
  id: uuid('id').primaryKey().defaultRandom(),
  trainingId: uuid('trainingId').notNull(), // Связь с тренировкой
  teamId: uuid('teamId').notNull(), // Команда для быстрого поиска
  scheduledTime: time('scheduledTime').notNull(), // Время отправки опроса (например, "15:30")
  status: varchar('status', { length: 20 }).default('scheduled').notNull(), // 'scheduled', 'sent', 'cancelled'
  recipientsConfig: text('recipientsConfig'), // JSON конфигурация получателей
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
  sentAt: timestamp('sentAt', { withTimezone: true }), // Когда был реально отправлен
  createdById: uuid('createdById').notNull(), // Кто создал расписание
});
