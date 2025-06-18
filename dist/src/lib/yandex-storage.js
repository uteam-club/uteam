import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
const s3 = new S3Client({
    region: process.env.YANDEX_STORAGE_REGION,
    endpoint: "https://storage.yandexcloud.net",
    credentials: {
        accessKeyId: process.env.YANDEX_STORAGE_ACCESS_KEY,
        secretAccessKey: process.env.YANDEX_STORAGE_SECRET_KEY,
    },
});
const BUCKET = process.env.YANDEX_STORAGE_BUCKET;
// Загрузка файла
export async function uploadFile(buffer, key, contentType) {
    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: "public-read",
    });
    await s3.send(command);
    return `https://storage.yandexcloud.net/${BUCKET}/${key}`;
}
// Удаление файла
export async function deleteFile(key) {
    const command = new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
    });
    await s3.send(command);
}
// Получение публичной ссылки
export function getFileUrl(key) {
    return `https://storage.yandexcloud.net/${BUCKET}/${key}`;
}
