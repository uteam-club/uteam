import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';
export const club = pgTable('Club', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    subdomain: varchar('subdomain', { length: 255 }).notNull().unique(),
    logoUrl: text('logoUrl'),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
    broadcastTime: varchar('broadcastTime', { length: 10 }),
});
