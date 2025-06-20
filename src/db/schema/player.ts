import { pgTable, uuid, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const player = pgTable('Player', {
  id: varchar('id', { length: 255 }).primaryKey(),
  firstName: varchar('firstName', { length: 255 }).notNull(),
  lastName: varchar('lastName', { length: 255 }).notNull(),
  middleName: varchar('middleName', { length: 255 }),
  number: integer('number'),
  position: varchar('position', { length: 255 }),
  strongFoot: varchar('strongFoot', { length: 255 }),
  dateOfBirth: timestamp('dateOfBirth', { withTimezone: true }),
  academyJoinDate: timestamp('academyJoinDate', { withTimezone: true }),
  nationality: varchar('nationality', { length: 255 }),
  imageUrl: text('imageUrl'),
  status: varchar('status', { length: 255 }),
  birthCertificateNumber: varchar('birthCertificateNumber', { length: 255 }),
  pinCode: varchar('pinCode', { length: 255 }).notNull(),
  telegramId: varchar('telegramId', { length: 255 }).unique(),
  language: varchar('language', { length: 10 }),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
  teamId: varchar('teamId', { length: 255 }).notNull(),
}); 