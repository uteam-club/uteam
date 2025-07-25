import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.YANDEX_STORAGE_REGION,
  endpoint: "https://storage.yandexcloud.net",
  credentials: {
    accessKeyId: process.env.YANDEX_STORAGE_ACCESS_KEY!,
    secretAccessKey: process.env.YANDEX_STORAGE_SECRET_KEY!,
  },
});
const BUCKET = process.env.YANDEX_STORAGE_BUCKET!;

// Удаление всех файлов команды из Яндекс Object Storage
async function deleteAllTeamFiles(teamId: string, clubId: string) {
  const prefix = `clubs/${clubId}/players`;
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

// ... existing code ...
// В месте, где раньше было удаление из Supabase Storage, вызывайте deleteAllTeamFiles(teamId, clubId) 