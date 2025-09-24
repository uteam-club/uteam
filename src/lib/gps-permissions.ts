import { db } from './db';
import { gpsPermission, gpsRolePermission, gpsUserPermission } from '@/db/schema/gpsPermissions';
import { eq, and, or, isNull } from 'drizzle-orm';

// Интерфейс для роли пользователя
interface UserRole {
  id: string;
  name: string;
  clubId: string;
}

export interface GpsPermissionCheck {
  hasPermission: boolean;
  source: 'role' | 'user' | 'none';
  details?: string;
}

/**
 * Получает роль пользователя в клубе
 */
async function getUserRole(userId: string, clubId: string): Promise<UserRole | null> {
  try {
    // Предполагаем, что у нас есть таблица userRoles или подобная
    // Для упрощения используем прямую проверку по userId и clubId
    const userRoles = await db
      .select({
        id: gpsRolePermission.role,
        name: gpsRolePermission.role
      })
      .from(gpsRolePermission)
      .where(
        eq(gpsRolePermission.role, 'ADMIN') // Временное решение - проверяем роль ADMIN
      )
      .limit(1);

    const userRole = userRoles[0];
    if (userRole) {
      return {
        id: userRole.id,
        name: userRole.name,
        clubId: clubId
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Проверяет, есть ли у пользователя GPS разрешение
 */
export async function hasGpsPermission(
  userId: string,
  clubId: string,
  teamId: string | null,
  permissionCode: string
): Promise<GpsPermissionCheck> {
  try {
    // 1. Получаем разрешение по коду
    const permissions = await db
      .select()
      .from(gpsPermission)
      .where(eq(gpsPermission.code, permissionCode))
      .limit(1);
    
    const permission = permissions[0];

    if (!permission) {
      return {
        hasPermission: false,
        source: 'none',
        details: `Permission ${permissionCode} not found`
      };
    }

    // 2. Проверяем пользовательские разрешения (приоритет)
    if (teamId) {
      const userPermissions = await db
        .select()
        .from(gpsUserPermission)
        .where(
          and(
            eq(gpsUserPermission.userId, userId),
            eq(gpsUserPermission.clubId, clubId),
            or(
              eq(gpsUserPermission.teamId, teamId),
              isNull(gpsUserPermission.teamId) // null = все команды клуба
            )
          )
        )
        .limit(1);
      
      const userPermission = userPermissions[0];

      if (userPermission) {
        // Проверяем конкретное разрешение
        const hasPermission = checkUserPermission(userPermission, permissionCode);
        if (hasPermission) {
          return {
            hasPermission: true,
            source: 'user',
            details: `User-specific permission for team ${teamId || 'all'}`
          };
        }
      }
    }

    // 3. Проверяем ролевые разрешения
    // Получаем роль пользователя из базы данных
    const userRole = await getUserRole(userId, clubId);
    
    if (userRole) {
      const rolePermissions = await db
        .select()
        .from(gpsRolePermission)
        .where(
          and(
            eq(gpsRolePermission.role, userRole.id),
            eq(gpsRolePermission.permissionId, permission.id)
          )
        );

      const hasRolePermission = rolePermissions.some(rp => rp.allowed);

      if (hasRolePermission) {
        return {
          hasPermission: true,
          source: 'role',
          details: `Role-based permission for role ${userRole.name}`
        };
      }
    }

    return {
      hasPermission: false,
      source: 'none',
      details: 'No permission found'
    };

  } catch (error) {
    console.error('Error checking GPS permission:', error);
    return {
      hasPermission: false,
      source: 'none',
      details: 'Error checking permission'
    };
  }
}

/**
 * Проверяет пользовательское разрешение на основе типа операции
 */
function checkUserPermission(userPermission: any, permissionCode: string): boolean {
  const permissionMap: Record<string, keyof typeof userPermission> = {
    'gps.reports.view': 'canView',
    'gps.reports.create': 'canEdit',
    'gps.reports.edit': 'canEdit',
    'gps.reports.delete': 'canDelete',
    'gps.reports.export': 'canExport',
    'gps.profiles.view': 'canView',
    'gps.profiles.create': 'canManageProfiles',
    'gps.profiles.edit': 'canManageProfiles',
    'gps.profiles.delete': 'canManageProfiles',
    'gps.data.view': 'canView',
    'gps.data.edit': 'canEdit',
    'gps.data.export': 'canExport',
    'gps.admin.manage': 'canManageProfiles',
    'gps.admin.permissions': 'canManageProfiles'
  };

  const field = permissionMap[permissionCode];
  return field ? userPermission[field] : false;
}

/**
 * Получает все GPS разрешения пользователя
 */
export async function getUserGpsPermissions(
  userId: string,
  clubId: string,
  teamId: string | null
): Promise<string[]> {
  try {
    const permissions: string[] = [];

    // 1. Получаем пользовательские разрешения
    if (teamId) {
      const [userPermission] = await db
        .select()
        .from(gpsUserPermission)
        .where(
          and(
            eq(gpsUserPermission.userId, userId),
            eq(gpsUserPermission.clubId, clubId),
            or(
              eq(gpsUserPermission.teamId, teamId),
              isNull(gpsUserPermission.teamId)
            )
          )
        )
        .limit(1);

      if (userPermission) {
        // Добавляем разрешения на основе пользовательских прав
        if (userPermission.canView) {
          permissions.push('gps.reports.view', 'gps.profiles.view', 'gps.data.view');
        }
        if (userPermission.canEdit) {
          permissions.push('gps.reports.create', 'gps.reports.edit', 'gps.data.edit');
        }
        if (userPermission.canDelete) {
          permissions.push('gps.reports.delete');
        }
        if (userPermission.canExport) {
          permissions.push('gps.reports.export', 'gps.data.export');
        }
        if (userPermission.canManageProfiles) {
          permissions.push('gps.profiles.create', 'gps.profiles.edit', 'gps.profiles.delete', 'gps.admin.manage', 'gps.admin.permissions');
        }
      }
    }

    // 2. Если нет пользовательских разрешений, получаем ролевые
    if (permissions.length === 0) {
      const userRole = await getUserRole(userId, clubId);
      if (userRole) {
        // Получаем все разрешения для роли
        const rolePermissions = await db
          .select({
            permissionCode: gpsPermission.code
          })
          .from(gpsRolePermission)
          .innerJoin(gpsPermission, eq(gpsRolePermission.permissionId, gpsPermission.id))
          .where(
            and(
              eq(gpsRolePermission.role, userRole.id),
              eq(gpsRolePermission.allowed, true)
            )
          );

        permissions.push(...rolePermissions.map(rp => rp.permissionCode));
      } else {
        // Если нет роли, возвращаем базовые разрешения
        permissions.push('gps.reports.view', 'gps.profiles.view', 'gps.data.view');
      }
    }

    return [...new Set(permissions)]; // Убираем дубликаты

  } catch (error) {
    console.error('Error getting user GPS permissions:', error);
    return [];
  }
}

/**
 * Проверяет, может ли пользователь выполнить действие с GPS отчетом
 */
export async function canAccessGpsReport(
  userId: string,
  clubId: string,
  teamId: string | null,
  action: 'view' | 'edit' | 'delete' | 'export'
): Promise<boolean> {
  const permissionCode = `gps.reports.${action}`;
  const result = await hasGpsPermission(userId, clubId, teamId, permissionCode);
  return result.hasPermission;
}

/**
 * Проверяет, может ли пользователь выполнить действие с GPS профилем
 */
export async function canAccessGpsProfile(
  userId: string,
  clubId: string,
  teamId: string | null,
  action: 'view' | 'create' | 'edit' | 'delete'
): Promise<boolean> {
  const permissionCode = `gps.profiles.${action}`;
  const result = await hasGpsPermission(userId, clubId, teamId, permissionCode);
  return result.hasPermission;
}

/**
 * Проверяет, может ли пользователь выполнить действие с GPS данными
 */
export async function canAccessGpsData(
  userId: string,
  clubId: string,
  teamId: string | null,
  action: 'view' | 'edit' | 'export'
): Promise<boolean> {
  const permissionCode = `gps.data.${action}`;
  const result = await hasGpsPermission(userId, clubId, teamId, permissionCode);
  return result.hasPermission;
}
