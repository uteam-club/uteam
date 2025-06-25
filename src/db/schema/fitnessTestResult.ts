import { pgTable, uuid, timestamp, numeric } from 'drizzle-orm/pg-core';
import { fitnessTest } from './fitnessTest';
import { player } from './player';
import { team } from './team';
import { user } from './user';

export const fitnessTestResult = pgTable('fitness_test_result', {
  id: uuid('id').primaryKey().defaultRandom(),
  testId: uuid('test_id').notNull().references(() => fitnessTest.id),
  playerId: uuid('player_id').notNull().references(() => player.id),
  teamId: uuid('team_id').notNull().references(() => team.id),
  value: numeric('value', { precision: 10, scale: 2 }).notNull(),
  date: timestamp('date').defaultNow().notNull(),
  createdBy: uuid('created_by').notNull().references(() => user.id),
}); 