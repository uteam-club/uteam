import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { gpsProfile } from '@/db/schema/gpsProfile';
import { eq, and, desc } from 'drizzle-orm';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';

// Проверка доступа к клубу
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return token.clubId === club.id;
}

// Валидация columnMapping
function validateColumnMapping(columns: any[]): { isValid: boolean; errors: string[]; validatedColumns: any[] } {
  const errors: string[] = [];
  const validatedColumns: any[] = [];

  if (!Array.isArray(columns) || columns.length === 0) {
    errors.push('Должна быть добавлена хотя бы одна колонка');
    return { isValid: false, errors, validatedColumns };
  }

  // Обязательные поля для B-SIGHT системы
  const requiredFields = ['Player', 'Time', 'TD'];
  const requiredFieldNames = ['Игрок', 'Время', 'Общая дистанция'];

  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    const columnErrors: string[] = [];

    // Проверка обязательных полей
    if (!column.name || typeof column.name !== 'string') {
      columnErrors.push('Название колонки обязательно');
    }

    if (!column.mappedColumn || typeof column.mappedColumn !== 'string') {
      columnErrors.push('Маппинг колонки обязателен');
    }

    // Проверка на русские названия в mappedColumn
    const russianPattern = /[а-яё]/i;
    if (russianPattern.test(column.mappedColumn)) {
      // Убираем эту проверку - разрешаем русские названия в mappedColumn
      // columnErrors.push(`Колонка "${column.name}": используйте английские названия вместо "${column.mappedColumn}"`);
    }

    // Проверка на специальные символы
    const specialCharsPattern = /[^a-zA-Z0-9\s\-_]/;
    if (specialCharsPattern.test(column.mappedColumn)) {
      // Убираем эту проверку - разрешаем любые символы в mappedColumn
      // columnErrors.push(`Колонка "${column.name}": избегайте специальных символов в названии колонки`);
    }

    // Проверка дублирования mappedColumn
    const duplicateIndex = validatedColumns.findIndex(col => col.mappedColumn === column.mappedColumn);
    if (duplicateIndex !== -1) {
      columnErrors.push(`Колонка "${column.name}": дублирует маппинг колонки "${validatedColumns[duplicateIndex].name}"`);
    }

    if (columnErrors.length > 0) {
      errors.push(`Колонка "${column.name || `#${i + 1}`}": ${columnErrors.join(', ')}`);
    } else {
      // Создаем валидированную колонку с правильной структурой
      validatedColumns.push({
        name: column.name,
        type: column.type || 'column',
        order: column.order || i + 1,
        mappedColumn: column.mappedColumn,
        displayName: column.displayName || column.name,
        dataType: column.dataType || 'string',
        isVisible: column.isVisible !== undefined ? column.isVisible : true
      });
    }
  }

  // Проверка наличия обязательных полей
  const columnNames = validatedColumns.map(col => col.name);
  const missingRequired = requiredFields.filter(field => !columnNames.includes(field));
  
  if (missingRequired.length > 0) {
    errors.push(`Отсутствуют обязательные поля: ${missingRequired.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    validatedColumns
  };
}

// GET - получение списка GPS профилей
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'gpsProfiles.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }

  try {
    const profiles = await db
      .select()
      .from(gpsProfile)
      .where(eq(gpsProfile.clubId, token.clubId))
      .orderBy(desc(gpsProfile.createdAt));

    return NextResponse.json(profiles);
  } catch (error) {
    console.error('Ошибка при получении GPS профилей:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - создание нового GPS профиля
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'gpsProfiles.create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, columns, gpsSystem = 'B-SIGHT' } = body;

    // Валидация названия профиля
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Название профиля обязательно',
        field: 'name'
      }, { status: 400 });
    }

    if (name.trim().length < 3) {
      return NextResponse.json({ 
        error: 'Название профиля должно содержать минимум 3 символа',
        field: 'name'
      }, { status: 400 });
    }

    // Валидация columnMapping
    const validation = validateColumnMapping(columns || []);
    
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'Ошибки валидации колонок',
        details: validation.errors,
        field: 'columns'
      }, { status: 400 });
    }

    // Проверка на дублирование названия профиля
    const existingProfile = await db
      .select()
      .from(gpsProfile)
      .where(and(
        eq(gpsProfile.clubId, token.clubId),
        eq(gpsProfile.name, name.trim())
      ));

    if (existingProfile.length > 0) {
      return NextResponse.json({ 
        error: 'Профиль с таким названием уже существует',
        field: 'name'
      }, { status: 400 });
    }

    // Создание профиля с валидированными данными
    const visualizationConfig = {
      charts: [
        {
          type: 'bar',
          title: 'Дистанция по игрокам',
          metric: 'distance',
          color: '#3B82F6'
        }
      ]
    };

    const metricsConfig = {
      distance: { aggregation: 'sum', unit: 'м' },
      time: { aggregation: 'sum', unit: 'мин' },
      maxSpeed: { aggregation: 'max', unit: 'км/ч' }
    };

    const [newProfile] = await db
      .insert(gpsProfile)
      .values({
        name: name.trim(),
        description: `Профиль для системы ${gpsSystem}`,
        gpsSystem,
        isDefault: false,
        isActive: true,
        visualizationConfig,
        metricsConfig,
        customFormulas: null,
        columnMapping: validation.validatedColumns,
        dataFilters: null,
        clubId: token.clubId,
        createdById: token.id,
      })
      .returning();

    return NextResponse.json({
      ...newProfile,
      message: 'Профиль успешно создан'
    });

  } catch (error) {
    console.error('Ошибка при создании GPS профиля:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 