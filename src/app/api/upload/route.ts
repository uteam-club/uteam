import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    console.log('Upload API вызван');
    
    if (!supabaseAdmin) {
      console.error('Ошибка: Supabase не инициализирован');
      return NextResponse.json({ error: 'Ошибка конфигурации сервера' }, { status: 500 });
    }

    // Диагностика подключения к Supabase
    try {
      const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
      if (bucketsError) {
        console.error('Ошибка при получении списка бакетов:', bucketsError);
      } else {
        console.log('Доступные бакеты:', buckets.map(b => b.name));
      }
    } catch (diagError) {
      console.error('Ошибка диагностики Supabase:', diagError);
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType')?.toString() || 'photo'; // 'photo' или 'document'
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }
    
    console.log('Получен файл:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Проверка типа файла
    if (!file.type.startsWith('image/') && !file.type.startsWith('application/pdf')) {
      return NextResponse.json({ error: 'Загрузить можно только изображения или PDF-документы' }, { status: 400 });
    }
    
    // Определяем расширение файла
    const fileExtension = file.name.split('.').pop();
    
    // Создаем уникальное имя файла - избегаем проблем с кириллицей
    const sanitizedName = file.name
      .replace(/[^\w\s.-]/g, '') // Удаляем все кроме букв, цифр, пробелов, точек и дефисов
      .replace(/\s+/g, '_'); // Заменяем пробелы на подчеркивания
    
    const fileName = `${uuidv4()}-${sanitizedName}`;
    
    // Выбираем папку в зависимости от типа файла
    const folderPath = fileType === 'document' ? 'player-documents' : 'player-photos';
    
    // Путь в хранилище
    const filePath = `${folderPath}/${fileName}`;
    
    // Проверяем существование бакета vista-media
    try {
      const { data: bucketInfo, error: bucketError } = await supabaseAdmin.storage.getBucket('vista-media');
      if (bucketError) {
        console.error('Ошибка при получении информации о бакете vista-media:', bucketError);
        
        // Если бакет не существует, пытаемся создать его
        if (bucketError.message && bucketError.message.includes('not found')) {
          console.log('Создаем бакет vista-media...');
          const { data: createData, error: createError } = await supabaseAdmin.storage.createBucket('vista-media', {
            public: true
          });
          
          if (createError) {
            console.error('Ошибка создания бакета vista-media:', createError);
            return NextResponse.json({ error: 'Не удалось создать бакет хранилища' }, { status: 500 });
          }
          
          console.log('Бакет vista-media создан');
        } else {
          return NextResponse.json({ error: 'Ошибка хранилища: ' + bucketError.message }, { status: 500 });
        }
      } else {
        console.log('Бакет vista-media найден:', bucketInfo);
      }
    } catch (e: any) {
      console.error('Ошибка при работе с бакетом:', e);
    }
    
    console.log(`Загрузка ${fileType === 'document' ? 'документа' : 'фото'} в Supabase:`, {
      size: file.size,
      type: file.type,
      path: filePath
    });
    
    // Пробуем получить информацию о папке
    try {
      const { data: folderCheck, error: folderError } = await supabaseAdmin.storage
        .from('vista-media')
        .list(folderPath);
        
      if (folderError) {
        console.log(`Ошибка при проверке папки ${folderPath}:`, folderError);
        
        // Создаем папку через загрузку пустого файла
        const { data: folderCreate, error: folderCreateError } = await supabaseAdmin.storage
          .from('vista-media')
          .upload(`${folderPath}/.gitkeep`, '', {
            contentType: 'text/plain',
            upsert: true
          });
          
        if (folderCreateError) {
          console.error(`Ошибка при создании папки ${folderPath}:`, folderCreateError);
        } else {
          console.log(`Папка ${folderPath} создана`);
        }
      } else {
        console.log(`Проверка папки ${folderPath}:`, folderCheck);
      }
    } catch (e) {
      console.error(`Ошибка при проверке папки ${folderPath}:`, e);
    }
    
    // Конвертируем файл в ArrayBuffer
    let arrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
      console.log('Файл успешно конвертирован в ArrayBuffer');
    } catch (e) {
      console.error('Ошибка при конвертации файла в ArrayBuffer:', e);
      return NextResponse.json({ error: 'Ошибка обработки файла' }, { status: 500 });
    }
    
    // Загружаем файл в Supabase Storage в бакет vista-media
    let uploadResult;
    try {
      uploadResult = await supabaseAdmin.storage
        .from('vista-media')
        .upload(filePath, arrayBuffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: true
        });
    } catch (e: any) {
      console.error('Ошибка при вызове API загрузки:', e);
      return NextResponse.json({ error: `Ошибка загрузки файла: ${e.message || 'Неизвестная ошибка'}` }, { status: 500 });
    }
    
    const { data, error } = uploadResult;
    
    if (error) {
      console.error('Ошибка загрузки файла в Supabase:', error);
      return NextResponse.json({ error: `Ошибка загрузки файла: ${error.message}` }, { status: 500 });
    }
    
    // Получаем публичный URL файла
    const publicUrlResult = supabaseAdmin.storage
      .from('vista-media')
      .getPublicUrl(filePath);
    
    if (!publicUrlResult.data.publicUrl) {
      console.error('Ошибка получения публичного URL');
      return NextResponse.json({ error: 'Ошибка получения публичного URL' }, { status: 500 });
    }
    
    const publicUrl = publicUrlResult.data.publicUrl;
    console.log('Файл успешно загружен:', publicUrl);
    
    return NextResponse.json({
      url: publicUrl,
      fileName,
      filePath,
      fileType: file.type
    }, { status: 200 });
  } catch (error: any) {
    console.error('Необработанная ошибка при загрузке файла:', error);
    return NextResponse.json({ 
      error: 'Необработанная ошибка при загрузке файла', 
      details: error.message || String(error)
    }, { status: 500 });
  }
} 