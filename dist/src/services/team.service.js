import { db } from '@/lib/db';
import { team } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
export async function getTeamsByClubId(clubId) {
    try {
        return await db.select().from(team).where(eq(team.clubId, clubId)).orderBy(asc(team.name));
    }
    catch (error) {
        console.error("Error fetching teams by club id:", error);
        return [];
    }
}
export async function getTeamById(id) {
    try {
        const [result] = await db.select().from(team).where(eq(team.id, id));
        return result !== null && result !== void 0 ? result : null;
    }
    catch (error) {
        console.error("Error fetching team by id:", error);
        return null;
    }
}
export async function createTeam(data) {
    try {
        const [created] = await db.insert(team).values(Object.assign(Object.assign({}, data), { id: uuidv4(), createdAt: new Date(), updatedAt: new Date() })).returning();
        return created !== null && created !== void 0 ? created : null;
    }
    catch (error) {
        console.error("Error creating team:", error);
        return null;
    }
}
export async function updateTeam(id, data) {
    try {
        const [updated] = await db.update(team)
            .set(data)
            .where(eq(team.id, id))
            .returning();
        return updated !== null && updated !== void 0 ? updated : null;
    }
    catch (error) {
        console.error("Error updating team:", error);
        return null;
    }
}
export async function deleteTeam(id) {
    try {
        await db.delete(team).where(eq(team.id, id));
        return true;
    }
    catch (error) {
        console.error("Error deleting team:", error);
        return false;
    }
}
