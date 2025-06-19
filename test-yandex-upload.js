require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');

const REGION = process.env.YANDEX_STORAGE_REGION || 'ru-central1';
const ENDPOINT = 'https://storage.yandexcloud.net';
const BUCKET = process.env.YANDEX_STORAGE_BUCKET;
const ACCESS_KEY = process.env.YANDEX_STORAGE_ACCESS_KEY;
const SECRET_KEY = process.env.YANDEX_STORAGE_SECRET_KEY;

console.log('YANDEX_STORAGE_BUCKET', BUCKET);
console.log('YANDEX_STORAGE_REGION', REGION);
console.log('YANDEX_STORAGE_ENDPOINT', ENDPOINT);
console.log('YANDEX_STORAGE_ACCESS_KEY', ACCESS_KEY);
console.log('YANDEX_STORAGE_SECRET_KEY', SECRET_KEY);

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
});

async function uploadTestFile() {
  const filePath = './README.md'; // используем README.md как тестовый файл
  const fileContent = fs.readFileSync(filePath);
  const key = 'test-upload-readme.md';

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileContent,
    ContentType: 'text/markdown',
  });

  try {
    await s3.send(command);
    console.log('Файл успешно загружен!');
    console.log(`https://storage.yandexcloud.net/${BUCKET}/${key}`);
  } catch (error) {
    console.error('Ошибка загрузки:', error);
  }
}

uploadTestFile(); 