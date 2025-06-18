import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
export const roleEnum = pgEnum('Role', ['SUPER_ADMIN', 'ADMIN', 'COACH', 'MEMBER', 'SCOUT', 'DOCTOR', 'DIRECTOR']);
export const user = pgTable('User', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }),
    password: varchar('password', { length: 255 }).notNull(),
    role: roleEnum('role').default('MEMBER').notNull(),
    emailVerified: timestamp('emailVerified', { withTimezone: true }),
    imageUrl: text('imageUrl'),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
    clubId: uuid('clubId').notNull(),
});
