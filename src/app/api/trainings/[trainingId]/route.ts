import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/trainings/[trainingId] - получить тренировку по ID
export async function GET(
  request: Request,
  { params }: { params: { trainingId: string } }
) {
  const trainingId = params.trainingId;
  
  if (!trainingId) {
    return NextResponse.json(
      { error: 'Не указан ID тренировки' },
      { status: 400 }
    );
  }
  
  try {
    // Получаем тренировку по ID с включением связанных данных
    const training = await prisma.training.findUnique({
      where: {
        id: trainingId
      },
      include: {
        category: true,
        team: true
      }
    });
    
    if (!training) {
      return NextResponse.json(
        { error: 'Тренировка не найдена' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(training);
  } catch (error) {
    console.error('Ошибка при получении тренировки:', error);
    return NextResponse.json(
      { error: 'Не удалось получить тренировку' },
      { status: 500 }
    );
  }
}

// DELETE /api/trainings/[trainingId] - удалить тренировку по ID
export async function DELETE(
  request: Request,
  { params }: { params: { trainingId: string } }
) {
  const trainingId = params.trainingId;
  
  if (!trainingId) {
    return NextResponse.json(
      { error: 'Не указан ID тренировки' },
      { status: 400 }
    );
  }
  
  try {
    // Удаляем тренировку по ID
    // Связанные записи (упражнения, участники) будут удалены автоматически из-за каскадного удаления в схеме Prisma
    const deletedTraining = await prisma.training.delete({
      where: {
        id: trainingId
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Тренировка успешно удалена',
      id: deletedTraining.id
    });
  } catch (error) {
    console.error('Ошибка при удалении тренировки:', error);
    return NextResponse.json(
      { error: 'Не удалось удалить тренировку' },
      { status: 500 }
    );
  }
} 