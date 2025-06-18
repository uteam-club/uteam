import { db } from '@/lib/db';
import { club } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
const s3 = new S3Client({
    region: process.env.YANDEX_STORAGE_REGION,
    endpoint: "https://storage.yandexcloud.net",
    credentials: {
        accessKeyId: process.env.YANDEX_STORAGE_ACCESS_KEY,
        secretAccessKey: process.env.YANDEX_STORAGE_SECRET_KEY,
    },
});
const BUCKET = process.env.YANDEX_STORAGE_BUCKET;
export async function getClubBySubdomain(subdomain) {
    if (!subdomain)
        return null;
    try {
        const [result] = await db.select().from(club).where(eq(club.subdomain, subdomain));
        return result !== null && result !== void 0 ? result : null;
    }
    catch (error) {
        console.error('Error fetching club by subdomain:', error);
        return null;
    }
}
export async function getAllClubs() {
    try {
        return await db.select().from(club).orderBy(asc(club.name));
    }
    catch (error) {
        console.error('Error fetching all clubs:', error);
        return [];
    }
}
export async function createClub(data) {
    try {
        // Проверяем, что поддомен уникален
        const [existingClub] = await db.select().from(club).where(eq(club.subdomain, data.subdomain));
        if (existingClub) {
            throw new Error(`Клуб с поддоменом ${data.subdomain} уже существует`);
        }
        // Создаем новый клуб
        const [created] = await db.insert(club).values(Object.assign(Object.assign({}, data), { id: uuidv4(), createdAt: new Date(), updatedAt: new Date() })).returning();
        return created !== null && created !== void 0 ? created : null;
    }
    catch (error) {
        console.error('Error creating club:', error);
        return null;
    }
}
export async function updateClub(id, data) {
    try {
        const [updated] = await db.update(club)
            .set(data)
            .where(eq(club.id, id))
            .returning();
        return updated !== null && updated !== void 0 ? updated : null;
    }
    catch (error) {
        console.error('Error updating club:', error);
        return null;
    }
}
// Каскадное удаление всех файлов клуба из Яндекс Object Storage
async function deleteAllClubFiles(clubId) {
    const prefix = `clubs/${clubId}`;
    const listCommand = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix });
    const list = await s3.send(listCommand);
    if (list.Contents) {
        for (const file of list.Contents) {
            if (file.Key) {
                await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: file.Key }));
            }
        }
    }
}
export async function deleteClub(id) {
    try {
        // Каскадное удаление всех файлов клуба из Яндекс Object Storage
        await deleteAllClubFiles(id);
        await db.delete(club).where(eq(club.id, id));
        return true;
    }
    catch (error) {
        console.error('Error deleting club:', error);
        return false;
    }
}
