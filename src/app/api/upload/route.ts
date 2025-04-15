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
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }
    
    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Загрузить можно только изображения' }, { status: 400 });
    }
    
    // Определяем расширение файла
    const fileExtension = file.name.split('.').pop();
    
    // Создаем уникальное имя файла
    const fileName = `${uuidv4()}-${file.name.replace(/\s+/g, '_')}`;
    
    // Путь в хранилище - используем vista-media/player-photos/ в качестве пути
    const filePath = `player-photos/${fileName}`;
    
    // Конвертируем файл в ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    console.log('Загрузка файла в Supabase:', {
      size: arrayBuffer.byteLength,
      type: file.type,
      path: filePath
    });
    
    // Загружаем файл в Supabase Storage в бакет vista-media
    const { data, error } = await supabaseAdmin.storage
      .from('vista-media')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        cacheControl: '3600',
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
      filePath
    }, { status: 200 });
  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
    return NextResponse.json({ 
      error: `Ошибка сервера: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` 
    }, { status: 500 });
  }
} 