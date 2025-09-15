import { db } from '@/lib/db';
import { training } from '@/db/schema/training';
import { trainingCategory } from '@/db/schema/trainingCategory';
import { eq, and } from 'drizzle-orm';
import { Training } from '@/types/events';
import { ensureTrainingOwned } from '@/services/guards/ownership';

export async function getTrainingsByTeamId(teamId: string): Promise<Training[]> {
  try {
    const results = await db
      .select({
        id: training.id,
        title: training.title,
        description: training.description,
        date: training.date,
        location: training.location,
        notes: training.notes,
        status: training.status,
        createdAt: training.createdAt,
        updatedAt: training.updatedAt,
        clubId: training.clubId,
        teamId: training.teamId,
        categoryId: training.categoryId,
        createdById: training.createdById,
        type: training.type,
        time: training.time,
        categoryName: trainingCategory.name,
      })
      .from(training)
      .leftJoin(trainingCategory, eq(training.categoryId, trainingCategory.id))
      .where(eq(training.teamId, teamId));
    
    return results.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      date: t.date,
      startDate: t.date, // для совместимости
      location: t.location,
      notes: t.notes,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      clubId: t.clubId,
      teamId: t.teamId,
      categoryId: t.categoryId,
      createdById: t.createdById,
      type: t.type,
      time: t.time,
      category: t.categoryName || 'Без категории', // добавляем название категории
    }));
  } catch (error) {
    console.error('Error fetching trainings by team id:', error);
    return [];
  }
}

export async function getTrainingsByClubId(clubId: string): Promise<Training[]> {
  try {
    const results = await db
      .select({
        id: training.id,
        title: training.title,
        description: training.description,
        date: training.date,
        location: training.location,
        notes: training.notes,
        status: training.status,
        createdAt: training.createdAt,
        updatedAt: training.updatedAt,
        clubId: training.clubId,
        teamId: training.teamId,
        categoryId: training.categoryId,
        createdById: training.createdById,
        type: training.type,
        time: training.time,
        categoryName: trainingCategory.name,
      })
      .from(training)
      .leftJoin(trainingCategory, eq(training.categoryId, trainingCategory.id))
      .where(eq(training.clubId, clubId));
    
    return results.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      date: t.date,
      startDate: t.date, // для совместимости
      location: t.location,
      notes: t.notes,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      clubId: t.clubId,
      teamId: t.teamId,
      categoryId: t.categoryId,
      createdById: t.createdById,
      type: t.type,
      time: t.time,
      category: t.categoryName || 'Без категории', // добавляем название категории
    }));
  } catch (error) {
    console.error('Error fetching trainings by club id:', error);
    return [];
  }
}

export async function getTrainingById(id: string, clubId: string) {
  try {
    const [result] = await db.select().from(training)
      .where(and(eq(training.id, id), eq(training.clubId, clubId)));
    return result ?? null;
  } catch (error) {
    console.error('Error fetching training by id:', error);
    return null;
  }
}

export async function updateTraining(id: string, clubId: string, data: Partial<typeof training.$inferSelect>) {
  try {
    await ensureTrainingOwned(id, clubId);
    const [updated] = await db.update(training)
      .set(data)
      .where(eq(training.id, id))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error('Error updating training:', error);
    return null;
  }
}

export async function deleteTraining(id: string, clubId: string) {
  try {
    await ensureTrainingOwned(id, clubId);
    await db.delete(training).where(eq(training.id, id));
    return true;
  } catch (error) {
    console.error('Error deleting training:', error);
    return false;
  }
}
