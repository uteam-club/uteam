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
// Удаление всех файлов игрока из Яндекс Object Storage
async function deleteAllPlayerFiles(teamId, playerId) {
    const prefix = `clubs/${teamId}/players/${playerId}`;
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
