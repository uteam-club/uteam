require('dotenv').config();
const fetch = require('node-fetch');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function createFolder() {
  try {
    // Проверяем наличие бакета и создаем его, если отсутствует
    console.log('Проверка бакета vista-media...');
    const bucketResponse = await fetch(`${SUPABASE_URL}/storage/v1/bucket/vista-media`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!bucketResponse.ok && bucketResponse.status === 404) {
      console.log('Бакет не найден, создаем...');
      const createBucketResponse = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({
          id: 'vista-media',
          name: 'vista-media',
          public: true
        })
      });

      if (!createBucketResponse.ok) {
        const error = await createBucketResponse.json();
        console.error('Ошибка при создании бакета:', error);
        return;
      }
      console.log('Бакет vista-media успешно создан');
    }

    // Создаем папку player-documents через загрузку пустого файла
    console.log('Создание папки player-documents...');
    const emptyBuffer = Buffer.from([]);
    
    const formData = new FormData();
    formData.append('', new Blob([emptyBuffer]));
    
    const uploadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/vista-media/player-documents/.emptyfile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      console.error('Ошибка при создании папки:', error);
      return;
    }

    console.log('Папка player-documents успешно создана');
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

createFolder(); 