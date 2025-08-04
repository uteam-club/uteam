import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { db } from '@/lib/db';
import { gpsProfile } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';

// Проверка доступа к клубу
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return token.clubId === club.id;
}

// Валидация columnMapping (та же функция, что и в создании)
function validateColumnMapping(columns: any[]): { isValid: boolean; errors: string[]; validatedColumns: any[] } {
  console.log('🔍 Начало валидации columnMapping:', {
    columnsCount: columns?.length,
    columns: columns
  });
  
  const errors: string[] = [];
  const validatedColumns: any[] = [];

  if (!Array.isArray(columns) || columns.length === 0) {
    console.log('❌ Ошибка: пустой массив колонок');
    errors.push('Должна быть добавлена хотя бы одна колонка');
    return { isValid: false, errors, validatedColumns };
  }

  // Обязательные поля для B-SIGHT системы
  const requiredFields = ['Player', 'Time', 'TD'];
  console.log('📋 Проверяем обязательные поля:', requiredFields);
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
  console.log('📋 Найденные названия колонок:', columnNames);
  const missingRequired = requiredFields.filter(field => !columnNames.includes(field));
  console.log('❌ Отсутствующие обязательные поля:', missingRequired);
  
  if (missingRequired.length > 0) {
    errors.push(`Отсутствуют обязательные поля: ${missingRequired.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    validatedColumns
  };
  
  console.log('✅ Результат валидации:', {
    isValid: errors.length === 0,
    errorsCount: errors.length,
    validatedColumnsCount: validatedColumns.length
  });
}

// GET - получение профиля по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'gpsProfiles.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const profile = await db
      .select()
      .from(gpsProfile)
      .where(eq(gpsProfile.id, params.id))
      .limit(1);

    if (profile.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profileData = profile[0];
    console.log('📋 Профиль загружен:', {
      id: profileData.id,
      name: profileData.name,
      columnMappingLength: Array.isArray(profileData.columnMapping) ? profileData.columnMapping.length : 0
    });
    
    return NextResponse.json(profileData);
  } catch (error) {
    console.error('❌ Ошибка при получении профиля:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - обновление профиля
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔄 PUT запрос на обновление GPS профиля:', params.id);
  
  const token = await getToken({ req: request });
  if (!token) {
    console.log('❌ Не авторизован');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'gpsProfiles.update')) {
    console.log('❌ Нет прав на обновление');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    console.log('❌ Нет доступа к клубу');
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }

  try {
    const profileId = params.id;
    const body = await request.json();
    
    console.log('📋 Данные для обновления:', {
      profileId,
      name: body.name,
      columnMappingLength: body.columnMapping?.length,
      columnMapping: body.columnMapping
    });

    // Валидация названия профиля
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      console.log('❌ Ошибка валидации: название профиля обязательно');
      return NextResponse.json({
        error: 'Название профиля обязательно',
        field: 'name'
      }, { status: 400 });
    }

    if (body.name.trim().length < 3) {
      console.log('❌ Ошибка валидации: название слишком короткое');
      return NextResponse.json({
        error: 'Название профиля должно содержать минимум 3 символа',
        field: 'name'
      }, { status: 400 });
    }

    // Валидация columnMapping
    const validation = validateColumnMapping(body.columnMapping || []);
    console.log('🔍 Результат валидации columnMapping:', {
      isValid: validation.isValid,
      errorsCount: validation.errors.length,
      errors: validation.errors,
      validatedColumnsCount: validation.validatedColumns.length
    });

    if (!validation.isValid) {
      console.log('❌ Ошибка валидации columnMapping:', validation.errors);
      return NextResponse.json({
        error: 'Ошибки валидации колонок',
        details: validation.errors,
        field: 'columns'
      }, { status: 400 });
    }

    // Проверяем, что профиль принадлежит клубу пользователя
    const [existingProfile] = await db
      .select()
      .from(gpsProfile)
      .where(
        and(
          eq(gpsProfile.id, profileId),
          eq(gpsProfile.clubId, token.clubId)
        )
      );

    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Проверка на дублирование названия профиля (исключая текущий профиль)
    const existingProfileWithSameName = await db
      .select()
      .from(gpsProfile)
      .where(
        and(
          eq(gpsProfile.clubId, token.clubId),
          eq(gpsProfile.name, body.name.trim()),
          ne(gpsProfile.id, profileId) // Исключаем текущий профиль
        )
      );

    if (existingProfileWithSameName.length > 0) {
      return NextResponse.json({ 
        error: 'Профиль с таким названием уже существует',
        field: 'name'
      }, { status: 400 });
    }

    // Обновляем профиль с валидированными данными
    const [updatedProfile] = await db
      .update(gpsProfile)
      .set({
        name: body.name.trim(),
        description: body.description || existingProfile.description,
        gpsSystem: body.gpsSystem || existingProfile.gpsSystem,
        columnMapping: validation.validatedColumns,
        visualizationConfig: body.visualizationConfig || existingProfile.visualizationConfig,
        metricsConfig: body.metricsConfig || existingProfile.metricsConfig,
        customFormulas: body.customFormulas || existingProfile.customFormulas,
        dataFilters: body.dataFilters || existingProfile.dataFilters,
        isDefault: body.isDefault !== undefined ? body.isDefault : existingProfile.isDefault,
        isActive: body.isActive !== undefined ? body.isActive : existingProfile.isActive,
        updatedAt: new Date(),
      })
      .where(eq(gpsProfile.id, profileId))
      .returning();

    return NextResponse.json({
      ...updatedProfile,
      message: 'Профиль успешно обновлен'
    });

  } catch (error) {
    console.error('Ошибка при обновлении GPS профиля:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - удаление профиля
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'gpsProfiles.delete')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }

  try {
    const profileId = params.id;

    // Проверяем, что профиль принадлежит клубу пользователя
    const [existingProfile] = await db
      .select()
      .from(gpsProfile)
      .where(
        and(
          eq(gpsProfile.id, profileId),
          eq(gpsProfile.clubId, token.clubId)
        )
      );

    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Проверяем, не используется ли профиль в отчетах
    // TODO: Добавить проверку использования профиля в отчетах

    // Удаляем профиль
    await db
      .delete(gpsProfile)
      .where(eq(gpsProfile.id, profileId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении GPS профиля:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 