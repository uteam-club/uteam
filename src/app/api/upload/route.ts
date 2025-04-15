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
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType')?.toString() || 'photo'; // 'photo' или 'document'
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }
    
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
    
    console.log(`Загрузка ${fileType === 'document' ? 'документа' : 'фото'} в Supabase:`, {
      size: file.size,
      type: file.type,
      path: filePath,
      bucketInfo: await supabaseAdmin.storage.getBucket('vista-media')
    });
    
    // Пробуем получить информацию о папке
    try {
      const { data: folderCheck, error: folderError } = await supabaseAdmin.storage
        .from('vista-media')
        .list(folderPath);
        
      console.log(`Проверка папки ${folderPath}:`, folderCheck || folderError);
    } catch (e) {
      console.error(`Ошибка при проверке папки ${folderPath}:`, e);
    }
    
    // Конвертируем файл в ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Загружаем файл в Supabase Storage в бакет vista-media
    const { data, error } = await supabaseAdmin.storage
      .from('vista-media')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('Ошибка загрузки файла в Supabase:', error);
      return NextResponse.json({ error: `Ошибка загрузки файла: ${error.message}` }, { status: 500 });
    }
    
    // Получаем публичный URL файла
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('vista-media')
      .getPublicUrl(filePath);
    
    if (!publicUrl) {
      console.error('Ошибка получения публичного URL');
      return NextResponse.json({ error: 'Ошибка получения публичного URL' }, { status: 500 });
    }
    
    console.log('Файл успешно загружен:', publicUrl);
    
    return NextResponse.json({
      url: publicUrl,
      fileName,
      filePath,
      fileType: file.type
    }, { status: 200 });
  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
    return NextResponse.json({ 
      error: `Ошибка сервера: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` 
    }, { status: 500 });
  }
} 