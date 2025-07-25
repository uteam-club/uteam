// Универсальная функция проверки прав пользователя
// userPermissions — массив строк (коды прав) или объект { [code]: boolean }
export function hasPermission(userPermissions: string[] | Record<string, boolean>, permissionCode: string): boolean {
  if (Array.isArray(userPermissions)) {
    return userPermissions.includes(permissionCode);
  }
  return !!userPermissions[permissionCode];
} 