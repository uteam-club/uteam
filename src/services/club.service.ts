import { db } from '@/lib/db';
import { club } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getServiceSupabase } from '@/lib/supabase';

export async function getClubBySubdomain(subdomain: string) {
  if (!subdomain) return null;
  try {
    const [result] = await db.select().from(club).where(eq(club.subdomain, subdomain));
    return result ?? null;
  } catch (error) {
    console.error('Error fetching club by subdomain:', error);
    return null;
  }
}

export async function getAllClubs() {
  try {
    return await db.select().from(club).orderBy(asc(club.name));
  } catch (error) {
    console.error('Error fetching all clubs:', error);
    return [];
  }
}

export async function createClub(data: {
  name: string;
  subdomain: string;
  logoUrl?: string;
}) {
  try {
    // Проверяем, что поддомен уникален
    const [existingClub] = await db.select().from(club).where(eq(club.subdomain, data.subdomain));
    if (existingClub) {
      throw new Error(`Клуб с поддоменом ${data.subdomain} уже существует`);
    }
    // Создаем новый клуб
    const [created] = await db.insert(club).values({
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return created ?? null;
  } catch (error) {
    console.error('Error creating club:', error);
    return null;
  }
}

export async function updateClub(
  id: string,
  data: {
    name?: string;
    logoUrl?: string;
  }
) {
  try {
    const [updated] = await db.update(club)
      .set(data)
      .where(eq(club.id, id))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error('Error updating club:', error);
    return null;
  }
}

export async function deleteClub(id: string) {
  try {
    // Каскадное удаление всех файлов клуба из Supabase Storage
    try {
      const supabase = getServiceSupabase();
      const { data: list, error: listError } = await supabase.storage.from('club-media').list(`clubs/${id}`);
      if (!listError && list?.length) {
        for (const folder of list) {
          if (folder.name) {
            const { data: files } = await supabase.storage.from('club-media').list(`clubs/${id}/${folder.name}`);
            if (files?.length) {
              await supabase.storage.from('club-media').remove(files.map(f => `clubs/${id}/${folder.name}/${f.name}`));
            }
          }
        }
      }
    } catch (e) { console.error('Ошибка каскадного удаления файлов клуба:', e); }
    await db.delete(club).where(eq(club.id, id));
    return true;
  } catch (error) {
    console.error('Error deleting club:', error);
    return false;
  }
} 