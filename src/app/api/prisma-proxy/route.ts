import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { table, action, data, where, include, orderBy, take, skip } = await req.json();
    
    if (!table || !action) {
      return NextResponse.json(
        { error: 'Необходимо указать таблицу и действие' },
        { status: 400 }
      );
    }
    
    // Проверка, что запрашиваемая таблица существует в призме
    if (!(table in prisma)) {
      return NextResponse.json(
        { error: `Таблица ${table} не найдена` },
        { status: 404 }
      );
    }
    
    // Получаем модель Prisma для указанной таблицы
    const model = prisma[table as keyof typeof prisma];
    
    // Выполняем запрошенное действие
    let result;
    switch (action) {
      case 'findMany':
        result = await (model as any).findMany({
          where,
          include,
          orderBy,
          take,
          skip
        });
        break;
        
      case 'findUnique':
        result = await (model as any).findUnique({
          where,
          include
        });
        break;
        
      case 'count':
        result = await (model as any).count({
          where
        });
        break;
        
      case 'create':
        result = await (model as any).create({
          data,
          include
        });
        break;
        
      case 'update':
        result = await (model as any).update({
          where,
          data,
          include
        });
        break;
        
      case 'delete':
        result = await (model as any).delete({
          where,
          include
        });
        break;
        
      default:
        return NextResponse.json(
          { error: `Неизвестное действие ${action}` },
          { status: 400 }
        );
    }
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('API ошибка:', error);
    return NextResponse.json(
      { error: error.message || 'Произошла ошибка при выполнении запроса' },
      { status: 500 }
    );
  }
} 