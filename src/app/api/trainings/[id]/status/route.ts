import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { training, team, trainingCategory } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';
export const dynamic = 'force-dynamic';
export const revalidate = 0;


export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'trainings.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const data = await request.json();
    if (!data.status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }
    // Получаем тренировку
    const [trainingRow] = await db
      .select()
      .from(training)
      .where(eq(training.id, params.id));
    if (!trainingRow) {
      return NextResponse.json(
        { error: 'Training not found' },
        { status: 404 }
      );
    }
    if (trainingRow.clubId !== token.clubId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    // Обновляем статус тренировки
    await db
      .update(training)
      .set({ status: data.status })
      .where(eq(training.id, params.id));
    // Получаем обновленную тренировку с join'ами
    const [updatedTraining] = await db
      .select()
      .from(training)
      .where(eq(training.id, params.id));
    const [teamRow] = await db
      .select()
      .from(team)
      .where(eq(team.id, updatedTraining.teamId));
    const [categoryRow] = await db
      .select()
      .from(trainingCategory)
      .where(eq(trainingCategory.id, updatedTraining.categoryId));
    const formattedTraining = {
      id: updatedTraining.id,
      title: updatedTraining.title,
      teamId: updatedTraining.teamId,
      team: teamRow?.name || null,
      date: updatedTraining.date,
      categoryId: updatedTraining.categoryId,
      category: categoryRow?.name || null,
      status: updatedTraining.status,
      createdAt: updatedTraining.createdAt,
      updatedAt: updatedTraining.updatedAt,
    };
    return NextResponse.json(formattedTraining);
  } catch (error) {
    console.error('Error updating training status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 