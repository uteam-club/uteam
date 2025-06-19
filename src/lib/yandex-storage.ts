import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

console.log('YANDEX_STORAGE_BUCKET', process.env.YANDEX_STORAGE_BUCKET);
console.log('YANDEX_STORAGE_REGION', process.env.YANDEX_STORAGE_REGION);
console.log('YANDEX_STORAGE_ENDPOINT', process.env.YANDEX_STORAGE_ENDPOINT);
console.log('YANDEX_STORAGE_ACCESS_KEY', process.env.YANDEX_STORAGE_ACCESS_KEY);
console.log('YANDEX_STORAGE_SECRET_KEY', process.env.YANDEX_STORAGE_SECRET_KEY);

const s3 = new S3Client({
  region: process.env.YANDEX_STORAGE_REGION,
  endpoint: "https://storage.yandexcloud.net",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.YANDEX_STORAGE_ACCESS_KEY!,
    secretAccessKey: process.env.YANDEX_STORAGE_SECRET_KEY!,
  },
});

const BUCKET = process.env.YANDEX_STORAGE_BUCKET!;

// Загрузка файла
export async function uploadFile(buffer: Buffer, key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType
  });
  await s3.send(command);
  return `https://storage.yandexcloud.net/${BUCKET}/${key}`;
}

// Удаление файла
export async function deleteFile(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  await s3.send(command);
}

// Получение публичной ссылки
export function getFileUrl(key: string) {
  return `https://storage.yandexcloud.net/${BUCKET}/${key}`;
} 