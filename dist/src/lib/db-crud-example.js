import { db } from './db';
import { user } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
// CREATE
export async function createUser(data) {
    var _a;
    const [created] = await db.insert(user).values({
        email: data.email,
        name: data.name,
        password: data.password,
        role: (_a = data.role) !== null && _a !== void 0 ? _a : 'MEMBER',
        clubId: data.clubId,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
    }).returning();
    return created;
}
// READ (получить всех пользователей клуба)
export async function getUsersByClub(clubId) {
    return db.select().from(user).where(eq(user.clubId, clubId));
}
// UPDATE (по id и clubId)
export async function updateUser(userId, clubId, updates) {
    const [updated] = await db.update(user)
        .set(updates)
        .where(and(eq(user.id, userId), eq(user.clubId, clubId)))
        .returning();
    return updated;
}
// DELETE (по id и clubId)
export async function deleteUser(userId, clubId) {
    await db.delete(user)
        .where(and(eq(user.id, userId), eq(user.clubId, clubId)));
}
