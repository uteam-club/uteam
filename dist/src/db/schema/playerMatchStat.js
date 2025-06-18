import { pgTable, uuid, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
export const playerMatchStat = pgTable('PlayerMatchStat', {
    id: uuid('id').primaryKey().defaultRandom(),
    matchId: uuid('matchId').notNull(),
    playerId: uuid('playerId').notNull(),
    isStarter: boolean('isStarter').default(false).notNull(),
    minutesPlayed: integer('minutesPlayed').default(0).notNull(),
    goals: integer('goals').default(0).notNull(),
    assists: integer('assists').default(0).notNull(),
    yellowCards: integer('yellowCards').default(0).notNull(),
    redCards: integer('redCards').default(0).notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});
