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
 * GET /api/teams/[id]/players/[playerId]
 * Получение данных конкретного игрока
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string, playerId: string } }
) {
  try {
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      console.log('GET /player: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const clubId = token.clubId as string;
    const teamId = params.id;
    const playerId = params.playerId;
    
    console.log(`GET /player: Fetching player ${playerId} from team ${teamId} in club ${clubId}`);
    
    // Проверяем, что команда принадлежит клубу пользователя
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        clubId: clubId,
      },
    });
    
    if (!team) {
      console.log(`GET /player: Team ${teamId} not found or not in club ${clubId}`);
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 404 });
    }
    
    // Получаем данные игрока
    const player = await prisma.player.findUnique({
      where: {
        id: playerId,
      },
    });
    
    if (!player || player.teamId !== teamId) {
      console.log(`GET /player: Player ${playerId} not found or not in team ${teamId}`);
      return NextResponse.json({ error: 'Player not found or not in this team' }, { status: 404 });
    }
    
    // Получаем список всех команд клуба (для выпадающего списка смены команды)
    const teams = await prisma.team.findMany({
      where: {
        clubId: clubId,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    console.log(`GET /player: Successfully fetched player ${playerId}`);
    return NextResponse.json({ 
      player: player, 
      teams: teams 
    });
  } catch (error: any) {
    console.error('Error fetching player:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch player',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/teams/[id]/players/[playerId]
 * Обновление данных игрока
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string, playerId: string } }
) {
  try {
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      console.log('PUT /player: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const clubId = token.clubId as string;
    const teamId = params.id;
    const playerId = params.playerId;
    
    console.log(`PUT /player: Updating player ${playerId} in team ${teamId} for club ${clubId}`);
    
    // Сначала проверяем, что команда принадлежит клубу пользователя
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        clubId: clubId,
      },
    });
    
    if (!team) {
      console.log(`PUT /player: Team ${teamId} not found or not in club ${clubId}`);
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 404 });
    }
    
    // Проверяем наличие игрока
    const existingPlayer = await prisma.player.findUnique({
      where: {
        id: playerId,
      },
    });
    
    if (!existingPlayer || existingPlayer.teamId !== teamId) {
      console.log(`PUT /player: Player ${playerId} not found or not in team ${teamId}`);
      return NextResponse.json({ error: 'Player not found or not in this team' }, { status: 404 });
    }
    
    // Получаем данные из запроса
    const data = await request.json();
    console.log('PUT /player: Request data:', data);
    
    // Проверяем, меняется ли команда
    let newTeamId = teamId;
    if (data.teamId && data.teamId !== teamId) {
      // Проверяем, что новая команда существует и принадлежит тому же клубу
      const newTeam = await prisma.team.findFirst({
        where: {
          id: data.teamId,
          clubId: clubId,
        },
      });
      
      if (!newTeam) {
        console.log(`PUT /player: New team ${data.teamId} not found or not in club ${clubId}`);
        return NextResponse.json({ error: 'New team not found or access denied' }, { status: 400 });
      }
      
      newTeamId = data.teamId;
    }
    
    // Подготавливаем данные для обновления
    const updateData = {
      firstName: data.firstName || existingPlayer.firstName,
      lastName: data.lastName || existingPlayer.lastName,
      middleName: data.middleName !== undefined ? data.middleName : existingPlayer.middleName,
      number: data.number !== undefined ? (data.number ? parseInt(data.number) : null) : existingPlayer.number,
      position: data.position !== undefined ? data.position : existingPlayer.position,
      strongFoot: data.strongFoot !== undefined ? data.strongFoot : existingPlayer.strongFoot,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : existingPlayer.dateOfBirth,
      academyJoinDate: data.academyJoinDate ? new Date(data.academyJoinDate) : existingPlayer.academyJoinDate,
      nationality: data.nationality !== undefined ? data.nationality : existingPlayer.nationality,
      imageUrl: data.imageUrl !== undefined ? data.imageUrl : existingPlayer.imageUrl,
      status: data.status !== undefined ? data.status : existingPlayer.status,
      teamId: newTeamId,
    };
    
    // Обновляем игрока
    const updatedPlayer = await prisma.player.update({
      where: {
        id: playerId,
      },
      data: updateData,
    });
    
    console.log(`PUT /player: Successfully updated player ${playerId}`);
    
    return NextResponse.json(updatedPlayer);
  } catch (error: any) {
    console.error('Error updating player:', error);
    return NextResponse.json({ 
      error: 'Failed to update player',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PATCH /api/teams/[id]/players/[playerId]
 * Частичное обновление данных игрока (например, только статус)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string, playerId: string } }
) {
  try {
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      console.log('PATCH /player: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const clubId = token.clubId as string;
    const teamId = params.id;
    const playerId = params.playerId;
    
    console.log(`PATCH /player: Updating status for player ${playerId} in team ${teamId} for club ${clubId}`);
    
    // Проверяем, что команда принадлежит клубу пользователя
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        clubId: clubId,
      },
    });
    
    if (!team) {
      console.log(`PATCH /player: Team ${teamId} not found or not in club ${clubId}`);
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 404 });
    }
    
    // Проверяем наличие игрока
    const existingPlayer = await prisma.player.findUnique({
      where: {
        id: playerId,
      },
    });
    
    if (!existingPlayer || existingPlayer.teamId !== teamId) {
      console.log(`PATCH /player: Player ${playerId} not found or not in team ${teamId}`);
      return NextResponse.json({ error: 'Player not found or not in this team' }, { status: 404 });
    }
    
    // Получаем данные из запроса
    const data = await request.json();
    console.log('PATCH /player: Request data:', data);
    
    // Обновляем только указанные поля
    const updateData: any = {};
    
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    
    // Проверяем, что есть данные для обновления
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    
    // Обновляем игрока
    const updatedPlayer = await prisma.player.update({
      where: {
        id: playerId,
      },
      data: updateData,
    });
    
    console.log(`PATCH /player: Successfully updated status for player ${playerId}`);
    
    return NextResponse.json(updatedPlayer);
  } catch (error: any) {
    console.error('Error updating player status:', error);
    return NextResponse.json({ 
      error: 'Failed to update player status',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
} 