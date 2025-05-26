import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import * as z from 'zod';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



// Схема для валидации данных при добавлении тренеров
const addCoachesSchema = z.object({
  coachIds: z.array(z.string().uuid()).min(1)
});

// Схема для валидации данных при удалении тренеров
const removeCoachesSchema = z.object({
  coachIds: z.array(z.string().uuid()).min(1)
});

/**
 * Получение токена из запроса с проверкой
 */
async function getTokenFromRequest(req: NextRequest) {
  try {
    return await getToken({ req });
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

/**
 * GET /api/teams/[id]/coaches
 * Получение списка тренеров команды
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      console.log('GET /team/coaches: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const clubId = token.clubId as string;
    const teamId = params.id;
    
    console.log(`GET /team/coaches: Fetching coaches for team ${teamId} in club ${clubId}`);
    
    // Проверяем, принадлежит ли команда клубу пользователя
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
        clubId
      }
    });
    
    if (!team) {
      console.log(`GET /team/coaches: Team ${teamId} not found in club ${clubId}`);
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    // Получаем список тренеров команды с информацией о пользователях
    const teamCoaches = await prisma.teamCoach.findMany({
      where: {
        teamId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            role: true
          }
        }
      }
    });
    
    console.log(`GET /team/coaches: Found ${teamCoaches.length} coaches for team ${teamId}`);
    
    // Возвращаем данные о тренерах
    return NextResponse.json(teamCoaches);
    
  } catch (error) {
    console.error('GET /team/coaches: Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team coaches' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teams/[id]/coaches
 * Добавление тренеров в команду
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      console.log('POST /team/coaches: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const clubId = token.clubId as string;
    const teamId = params.id;
    
    // Проверяем, принадлежит ли команда клубу пользователя
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
        clubId
      }
    });
    
    if (!team) {
      console.log(`POST /team/coaches: Team ${teamId} not found in club ${clubId}`);
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    // Получаем и валидируем данные из запроса
    const body = await request.json();
    const validationResult = addCoachesSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.log('POST /team/coaches: Invalid request data', validationResult.error);
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { coachIds } = validationResult.data;
    
    // Проверяем, что все пользователи существуют и имеют роль COACH в том же клубе
    const coaches = await prisma.user.findMany({
      where: {
        id: { in: coachIds },
        clubId,
        role: 'COACH'
      }
    });
    
    if (coaches.length !== coachIds.length) {
      console.log(`POST /team/coaches: Some coaches not found or not COACH role`);
      return NextResponse.json(
        { error: 'One or more coaches not found or not COACH role' },
        { status: 400 }
      );
    }
    
    // Получаем существующих тренеров, чтобы избежать дубликатов
    const existingCoaches = await prisma.teamCoach.findMany({
      where: {
        teamId,
        userId: { in: coachIds }
      }
    });
    
    const existingCoachIds = existingCoaches.map(coach => coach.userId);
    const newCoachIds = coachIds.filter(id => !existingCoachIds.includes(id));
    
    if (newCoachIds.length === 0) {
      console.log(`POST /team/coaches: All coaches already assigned to the team`);
      return NextResponse.json(
        { message: 'All coaches already assigned to the team' },
        { status: 200 }
      );
    }
    
    // Добавляем новых тренеров
    const result = await prisma.$transaction(
      newCoachIds.map(coachId => 
        prisma.teamCoach.create({
          data: {
            teamId,
            userId: coachId
          }
        })
      )
    );
    
    console.log(`POST /team/coaches: Added ${result.length} coaches to team ${teamId}`);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('POST /team/coaches: Error:', error);
    return NextResponse.json(
      { error: 'Failed to add coaches to team' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/teams/[id]/coaches
 * Удаление тренеров из команды
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      console.log('DELETE /team/coaches: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const clubId = token.clubId as string;
    const teamId = params.id;
    
    // Проверяем, принадлежит ли команда клубу пользователя
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
        clubId
      }
    });
    
    if (!team) {
      console.log(`DELETE /team/coaches: Team ${teamId} not found in club ${clubId}`);
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    // Получаем и валидируем данные из запроса
    const body = await request.json();
    const validationResult = removeCoachesSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.log('DELETE /team/coaches: Invalid request data', validationResult.error);
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { coachIds } = validationResult.data;
    
    // Удаляем связи тренеров с командой
    const result = await prisma.teamCoach.deleteMany({
      where: {
        teamId,
        userId: { in: coachIds }
      }
    });
    
    console.log(`DELETE /team/coaches: Removed ${result.count} coaches from team ${teamId}`);
    
    return NextResponse.json({ count: result.count });
    
  } catch (error) {
    console.error('DELETE /team/coaches: Error:', error);
    return NextResponse.json(
      { error: 'Failed to remove coaches from team' },
      { status: 500 }
    );
  }
} 