import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { club } from './club.ts';
import { user } from './user.ts';

export const fitnessTest = pgTable('fitness_test', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id').notNull().references(() => club.id),
  name: varchar('name', { length: 128 }).notNull(),
  type: varchar('type', { length: 64 }).notNull(), // тип теста (например, "антропометрия")
  unit: varchar('unit', { length: 32 }).notNull(), // единица измерения (например, "кг")
  description: varchar('description', { length: 512 }), // описание теста (правила, детали и т.д.)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').notNull().references(() => user.id),
}); 