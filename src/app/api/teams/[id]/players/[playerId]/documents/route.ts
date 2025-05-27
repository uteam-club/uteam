import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
import { uploadPlayerFile, deletePlayerFile } from '@/lib/supabase';
import { getServiceSupabase } from '@/lib/supabase';
import { transliterate } from '@/lib/transliterate';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



// Функция для чтения токена из заголовка Authorization
async function getTokenFromRequest(request: NextRequest) {
  // Сначала пробуем стандартный способ NextAuth
  try {
    const token = await getToken({ req: request });
    
    if (token) {
      console.log('Token found via NextAuth:', token.email);
      return token;
    }
    
    // Если нет токена NextAuth, проверяем заголовок Authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No Authorization header or not Bearer token');
      return null;
    }
    
    // Извлекаем токен из заголовка
    const bearerToken = authHeader.replace('Bearer ', '');
    
    // Верифицируем JWT токен
    const decodedToken = jwt.verify(
      bearerToken, 
      (() => {
        if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET не задан в .env');
        return process.env.NEXTAUTH_SECRET;
      })()
    ) as any;
    
    console.log('Token found via Authorization header:', decodedToken.email);
    
    // Возвращаем декодированный токен в том же формате, что и NextAuth
    return {
      id: decodedToken.id,
      email: decodedToken.email,
      name: decodedToken.name,
      role: decodedToken.role,
      clubId: decodedToken.clubId,
    };
  } catch (error) {
    console.error('Ошибка при получении/декодировании токена:', error);
    return null;
  }
}

/**
 * GET /api/teams/[id]/players/[playerId]/documents
 * Получение списка документов игрока
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string, playerId: string } }
) {
  try {
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      console.log('GET /player/documents: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const clubId = token.clubId as string;
    const teamId = params.id;
    const playerId = params.playerId;
    
    console.log(`GET /player/documents: Fetching documents for player ${playerId} from team ${teamId} in club ${clubId}`);
    
    // Проверяем, что команда принадлежит клубу пользователя
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        clubId: clubId,
      },
    });
    
    if (!team) {
      console.log(`GET /player/documents: Team ${teamId} not found or not in club ${clubId}`);
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 404 });
    }
    
    // Проверяем, что игрок принадлежит указанной команде
    const player = await prisma.player.findUnique({
      where: {
        id: playerId,
      },
    });
    
    if (!player || player.teamId !== teamId) {
      console.log(`GET /player/documents: Player ${playerId} not found or not in team ${teamId}`);
      return NextResponse.json({ error: 'Player not found or not in this team' }, { status: 404 });
    }
    
    // Получаем документы игрока
    const documents = await prisma.playerDocument.findMany({
      where: {
        playerId: playerId,
        clubId: clubId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`GET /player/documents: Found ${documents.length} documents for player ${playerId}`);
    
    return NextResponse.json(documents);
  } catch (error: any) {
    console.error('Error fetching player documents:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch player documents',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/teams/[id]/players/[playerId]/documents
 * Загрузка нового документа игрока
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string, playerId: string } }
) {
  try {
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      console.log('POST /player/documents: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const clubId = token.clubId as string;
    const userId = token.id as string;
    const teamId = params.id;
    const playerId = params.playerId;
    
    console.log(`POST /player/documents: Uploading document for player ${playerId} in team ${teamId}`);
    
    // Проверяем, что команда принадлежит клубу пользователя
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        clubId: clubId,
      },
    });
    
    if (!team) {
      console.log(`POST /player/documents: Team ${teamId} not found or not in club ${clubId}`);
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 404 });
    }
    
    // Проверяем, что игрок принадлежит указанной команде
    const player = await prisma.player.findUnique({
      where: {
        id: playerId,
      },
    });
    
    if (!player || player.teamId !== teamId) {
      console.log(`POST /player/documents: Player ${playerId} not found or not in team ${teamId}`);
      return NextResponse.json({ error: 'Player not found or not in this team' }, { status: 404 });
    }
    
    // Получаем данные из формы
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    
    if (!file || !type) {
      return NextResponse.json({ error: 'File and document type are required' }, { status: 400 });
    }
    
    // Проверяем размер файла
    if (file.size > 10 * 1024 * 1024) { // 10MB
      return NextResponse.json({ error: 'File is too large (max 10MB)' }, { status: 400 });
    }
    
    // Получаем сервисный клиент Supabase с увеличенным таймаутом для документов
    const supabase = getServiceSupabase({ 
      timeout: 10000, 
      retryCount: 2
    });
    
    // Инициализируем бакет перед загрузкой
    try {
      // Проверяем существование бакета
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('Ошибка при получении списка бакетов:', bucketsError);
      } else {
        // Проверяем, существует ли бакет club-media
        const bucketExists = buckets.some((bucket: any) => bucket.name === 'club-media');
        
        if (!bucketExists) {
          // Создаем бакет
          const { error: createError } = await supabase.storage.createBucket('club-media', {
            public: true,
            fileSizeLimit: 52428800, // 50MB
          });
          
          if (createError) {
            console.error('Ошибка при создании бакета:', createError);
          } else {
            console.log('Бакет club-media успешно создан');
          }
        } else {
          // Обновляем настройки бакета
          try {
            await supabase.storage.updateBucket('club-media', {
              public: true
            });
            console.log('Настройки бакета обновлены');
          } catch (updateError) {
            console.warn('Ошибка при обновлении настроек бакета:', updateError);
          }
        }
      }
    } catch (error) {
      console.warn('Ошибка при инициализации бакета:', error);
      // Продолжаем выполнение, это не должно блокировать загрузку
    }
    
    // Загружаем файл в Supabase Storage
    try {
      console.log(`Начинаем загрузку документа: ${file.name}, тип: ${type}, размер: ${file.size} байт`);
      
      // Создаем путь к файлу и метку времени
      const timestamp = Date.now();
      // Транслитерируем имя файла для избежания проблем с кириллицей
      const originalName = file.name.replace(/\s+/g, '_');
      const safeFileName = `${timestamp}-${transliterate(originalName)}`;
      const filePath = `clubs/${clubId}/players/${playerId}/documents/${safeFileName}`;
      
      console.log(`Загрузка документа по пути: ${filePath}`);
      
      // Получаем данные файла в виде ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = new Uint8Array(arrayBuffer);
      
      // Определяем правильный contentType
      let contentType = file.type;
      // Проверка для PDF файлов
      if (file.name.toLowerCase().endsWith('.pdf') && (!contentType || !contentType.includes('pdf'))) {
        contentType = 'application/pdf';
        console.log(`Принудительно установлен тип контента для PDF: ${contentType}`);
      }
      // Проверка для DOC/DOCX файлов
      else if (file.name.toLowerCase().endsWith('.doc') && (!contentType || !contentType.includes('word'))) {
        contentType = 'application/msword';
        console.log(`Принудительно установлен тип контента для DOC: ${contentType}`);
      }
      else if (file.name.toLowerCase().endsWith('.docx') && (!contentType || !contentType.includes('word'))) {
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        console.log(`Принудительно установлен тип контента для DOCX: ${contentType}`);
      }
      
      console.log(`Загрузка файла с contentType: ${contentType}`);
      
      // Загружаем файл в хранилище
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('club-media')
        .upload(filePath, fileBuffer, {
          upsert: true,
          contentType: contentType,
          // Добавляем метаданные
          cacheControl: '3600',
          metadata: {
            documentType: type,
            fileName: file.name,
            playerId,
            teamId,
            clubId
          }
        });
      
      if (uploadError) {
        console.error('Ошибка загрузки в Supabase:', uploadError);
        return NextResponse.json({ 
          error: 'Failed to upload document to storage',
          details: uploadError.message || 'Unknown error'
        }, { status: 500 });
      }
      
      if (!uploadData) {
        return NextResponse.json({ 
          error: 'Failed to upload document: no data returned',
        }, { status: 500 });
      }
      
      // Получаем публичный URL для доступа к файлу
      const { data: publicUrlData } = supabase.storage
        .from('club-media')
        .getPublicUrl(filePath);
        
      if (!publicUrlData || !publicUrlData.publicUrl) {
        return NextResponse.json({ 
          error: 'Failed to get public URL for the document',
        }, { status: 500 });
      }
      
      const publicUrl = publicUrlData.publicUrl;
      console.log(`Документ успешно загружен, публичный URL: ${publicUrl}`);
      
      // Создаем запись о документе в базе данных
      const document = await prisma.playerDocument.create({
        data: {
          name: file.name,
          type: type as any, // DocumentType enum
          url: filePath,
          publicUrl: publicUrl,
          size: file.size,
          playerId: playerId,
          clubId: clubId,
          uploadedById: userId
        }
      });
      
      console.log(`POST /player/documents: Document uploaded successfully with ID ${document.id}`);
      
      return NextResponse.json(document);
    } catch (uploadError: any) {
      console.error('Ошибка при загрузке документа в хранилище:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to upload document to storage',
        details: uploadError.message || 'Unknown error'
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error uploading player document:', error);
    return NextResponse.json({ 
      error: 'Failed to upload player document',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/teams/[id]/players/[playerId]/documents
 * Удаление документа игрока
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string, playerId: string } }
) {
  try {
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      console.log('DELETE /player/documents: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const clubId = token.clubId as string;
    const teamId = params.id;
    const playerId = params.playerId;
    
    // Получаем ID документа из запроса
    const { documentId } = await request.json();
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }
    
    console.log(`DELETE /player/documents: Deleting document ${documentId} for player ${playerId}`);
    
    // Проверяем, что команда принадлежит клубу пользователя
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        clubId: clubId,
      },
    });
    
    if (!team) {
      console.log(`DELETE /player/documents: Team ${teamId} not found or not in club ${clubId}`);
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 404 });
    }
    
    // Проверяем, что игрок принадлежит указанной команде
    const player = await prisma.player.findUnique({
      where: {
        id: playerId,
      },
    });
    
    if (!player || player.teamId !== teamId) {
      console.log(`DELETE /player/documents: Player ${playerId} not found or not in team ${teamId}`);
      return NextResponse.json({ error: 'Player not found or not in this team' }, { status: 404 });
    }
    
    // Получаем документ из базы данных
    const document = await prisma.playerDocument.findUnique({
      where: {
        id: documentId,
      },
    });
    
    if (!document || document.playerId !== playerId || document.clubId !== clubId) {
      console.log(`DELETE /player/documents: Document ${documentId} not found or access denied`);
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 });
    }
    
    // Удаляем файл из хранилища Supabase
    try {
      if (document.url) {
        console.log(`Удаляем файл из хранилища: ${document.url}`);
        await deletePlayerFile(document.url);
      }
    } catch (storageError) {
      console.error('Ошибка при удалении файла из хранилища:', storageError);
      // Продолжаем выполнение, т.к. запись в БД все равно нужно удалить
    }
    
    // Удаляем запись о документе из базы данных
    await prisma.playerDocument.delete({
      where: {
        id: documentId,
      },
    });
    
    console.log(`DELETE /player/documents: Document ${documentId} deleted successfully`);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting player document:', error);
    return NextResponse.json({ 
      error: 'Failed to delete player document',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
} 