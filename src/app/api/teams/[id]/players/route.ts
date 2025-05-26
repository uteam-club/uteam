import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
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
      process.env.NEXTAUTH_SECRET || 'fdcvista-default-secret-key-change-me'
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
 * Генерирует случайный шестизначный пин-код
 * @returns строка, содержащая шестизначный пин-код
 */
function generatePinCode(): string {
  // Генерируем случайное 6-значное число
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Проверяет, является ли пин-код уникальным в пределах указанной команды
 * @param pinCode пин-код для проверки
 * @param teamId идентификатор команды
 * @returns true, если пин-код уникален, false в противном случае
 */
async function isPinCodeUnique(pinCode: string, teamId: string): Promise<boolean> {
  const existingPlayer = await prisma.player.findFirst({
    where: {
      pinCode,
      teamId
    }
  });
  
  return !existingPlayer;
}

/**
 * Генерирует уникальный пин-код для игрока в команде
 * @param teamId идентификатор команды
 * @returns уникальный шестизначный пин-код
 */
async function generateUniquePinCode(teamId: string): Promise<string> {
  let pinCode = generatePinCode();
  let attempts = 0;
  const maxAttempts = 10; // Максимальное количество попыток для избежания бесконечного цикла
  
  // Проверяем, уникален ли пин-код, и генерируем новый, если это необходимо
  while (!(await isPinCodeUnique(pinCode, teamId)) && attempts < maxAttempts) {
    pinCode = generatePinCode();
    attempts++;
  }
  
  // Если после нескольких попыток не удалось сгенерировать уникальный пин-код,
  // возвращаем ошибку
  if (attempts >= maxAttempts) {
    throw new Error('Не удалось сгенерировать уникальный пин-код после нескольких попыток');
  }
  
  return pinCode;
}

/**
 * GET /api/teams/[id]/players
 * Получение списка игроков команды
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      console.log('GET /players: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const clubId = token.clubId as string;
    const teamId = params.id;
    
    console.log(`GET /players: Fetching for team ${teamId} in club ${clubId}`);
    
    // Проверяем, что команда принадлежит клубу пользователя
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        clubId: clubId,
      },
    });
    
    if (!team) {
      console.log(`GET /players: Team ${teamId} not found or not in club ${clubId}`);
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 404 });
    }
    
    // Получаем игроков команды, сортированных по фамилии
    const players = await prisma.player.findMany({
      where: {
        teamId: teamId,
      },
      orderBy: {
        lastName: 'asc',
      },
    });
    
    console.log(`GET /players: Found ${players.length} players for team ${teamId}`);
    return NextResponse.json(players);
  } catch (error: any) {
    console.error('Error fetching players:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch players',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/teams/[id]/players
 * Создание нового игрока в команде
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('POST /players: Start creating player request');
  
  try {
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      console.log('POST /players: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized - No valid token found' }, { status: 401 });
    }
    
    const clubId = token.clubId as string;
    const teamId = params.id;
    
    console.log(`POST /players: Creating player for team ${teamId} in club ${clubId}`);
    
    // Проверяем, что команда принадлежит клубу пользователя
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        clubId: clubId,
      },
    });
    
    if (!team) {
      console.log(`POST /players: Team ${teamId} not found or not in club ${clubId}`);
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 404 });
    }
    
    // Получаем данные из запроса
    const data = await request.json();
    console.log('POST /players: Request data:', data);
    
    // Проверяем обязательные поля
    if (!data.firstName || !data.lastName) {
      console.log('POST /players: Missing required fields');
      return NextResponse.json({ 
        error: 'Missing required fields: firstName and lastName are required'
      }, { status: 400 });
    }
    
    // Генерируем уникальный пин-код для игрока
    const pinCode = await generateUniquePinCode(teamId);
    console.log(`POST /players: Generated unique pin code: ${pinCode}`);
    
    // Создаем игрока
    const newPlayer = await prisma.player.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        number: data.number || null,
        position: data.position || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        imageUrl: data.imageUrl || null,
        pinCode: pinCode, // Устанавливаем сгенерированный пин-код
        teamId: teamId,
      },
    });
    
    console.log(`POST /players: Player created successfully with ID ${newPlayer.id} and pin code ${pinCode}`);
    return NextResponse.json(newPlayer);
  } catch (error: any) {
    console.error('Error creating player:', error);
    return NextResponse.json({ 
      error: 'Failed to create player',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/teams/[id]/players
 * Удаление одного или нескольких игроков из команды
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('DELETE /players: Start deleting players request');
  
  try {
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      console.log('DELETE /players: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const clubId = token.clubId as string;
    const teamId = params.id;
    
    console.log(`DELETE /players: Deleting players from team ${teamId} in club ${clubId}`);
    
    // Проверяем, что команда принадлежит клубу пользователя
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        clubId: clubId,
      },
    });
    
    if (!team) {
      console.log(`DELETE /players: Team ${teamId} not found or not in club ${clubId}`);
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 404 });
    }
    
    // Получаем данные из запроса
    const data = await request.json();
    console.log('DELETE /players: Request data:', data);
    
    if (!data.playerIds || !Array.isArray(data.playerIds) || data.playerIds.length === 0) {
      console.log('DELETE /players: No player IDs provided');
      return NextResponse.json({ 
        error: 'Missing playerIds: At least one player ID is required' 
      }, { status: 400 });
    }
    
    // Проверяем, что все игроки принадлежат указанной команде
    const players = await prisma.player.findMany({
      where: {
        id: { in: data.playerIds },
        teamId: teamId
      }
    });
    
    if (players.length !== data.playerIds.length) {
      console.log('DELETE /players: Some players not found or not in the team');
      return NextResponse.json({ 
        error: 'Some players not found or do not belong to this team'
      }, { status: 400 });
    }
    
    // Удаляем игроков
    const deleteResult = await prisma.player.deleteMany({
      where: {
        id: { in: data.playerIds },
        teamId: teamId
      }
    });
    
    console.log(`DELETE /players: Successfully deleted ${deleteResult.count} players`);
    
    return NextResponse.json({ 
      success: true, 
      deletedCount: deleteResult.count 
    });
  } catch (error: any) {
    console.error('Error deleting players:', error);
    return NextResponse.json({ 
      error: 'Failed to delete players',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
} 