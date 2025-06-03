import { db } from './db';
import { user } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// CREATE
export async function createUser(data: {
  email: string;
  name?: string;
  password: string;
  role?: 'SUPER_ADMIN' | 'ADMIN' | 'COACH' | 'MEMBER' | 'SCOUT' | 'DOCTOR' | 'DIRECTOR';
  clubId: string;
}) {
  const [created] = await db.insert(user).values({
    email: data.email,
    name: data.name,
    password: data.password,
    role: data.role ?? 'MEMBER',
    clubId: data.clubId,
    id: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return created;
}

// READ (получить всех пользователей клуба)
export async function getUsersByClub(clubId: string) {
  return db.select().from(user).where(eq(user.clubId, clubId));
}

// UPDATE (по id и clubId)
export async function updateUser(userId: string, clubId: string, updates: Partial<typeof user.$inferInsert>) {
  const [updated] = await db.update(user)
    .set(updates)
    .where(and(eq(user.id, userId), eq(user.clubId, clubId)))
    .returning();
  return updated;
}

// DELETE (по id и clubId)
export async function deleteUser(userId: string, clubId: string) {
  await db.delete(user)
    .where(and(eq(user.id, userId), eq(user.clubId, clubId)));
} 