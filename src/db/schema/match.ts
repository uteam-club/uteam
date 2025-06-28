import { pgTable, uuid, varchar, integer, boolean, text, timestamp } from 'drizzle-orm/pg-core';

export const match = pgTable('Match', {
  id: uuid('id').primaryKey().defaultRandom(),
  competitionType: varchar('competitionType', { length: 50 }).notNull(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  time: varchar('time', { length: 10 }).notNull(),
  isHome: boolean('isHome').notNull(),
  teamId: uuid('teamId').notNull(),
  opponentName: varchar('opponentName', { length: 255 }).notNull(),
  teamGoals: integer('teamGoals').default(0),
  opponentGoals: integer('opponentGoals').default(0),
  status: varchar('status', { length: 20 }).default('SCHEDULED').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
  clubId: uuid('clubId').notNull(),
  formation: varchar('formation', { length: 255 }),
  gameFormat: varchar('gameFormat', { length: 255 }),
  markerColor: varchar('markerColor', { length: 255 }),
  notes: text('notes'),
  playerPositions: text('playerPositions'),
  positionAssignments: text('positionAssignments'),
  timezone: varchar('timezone', { length: 64 }),
}); 