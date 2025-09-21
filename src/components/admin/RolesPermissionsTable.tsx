import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';

interface Permission {
  id: string;
  code: string;
  description: string;
}

interface RolePermission {
  permissionId: string;
  allowed: boolean;
  code: string;
  description: string;
}

// Группировка разрешений по категориям
const PERMISSION_CATEGORIES = {
  'teams': 'teams',
  'exercises': 'exercises',
  'trainings': 'trainings',
  'matches': 'matches',
  'attendance': 'attendance',
  'fitnessTests': 'fitness_tests',
  'calendar': 'calendar',
  'morningSurvey': 'morning_survey',
  'rpeSurvey': 'rpe_survey',
  'documents': 'documents',
  'adminPanel': 'admin_panel',
  'gps': 'gps'
};

export const RolesPermissionsTable: React.FC = () => {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, RolePermission[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  // Маппинг ролей для отображения с поддержкой i18n
  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      'SUPER_ADMIN': t('adminPage.role_super_admin', 'Супер Админ'),
      'ADMIN': t('adminPage.role_admin'),
      'COACH': t('adminPage.role_coach'),
      'MEMBER': t('adminPage.role_member'),
      'SCOUT': t('adminPage.role_scout'),
      'DOCTOR': t('adminPage.role_doctor'),
      'DIRECTOR': t('adminPage.role_director')
    };
    return roleMap[role] || role;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [rolesRes, permsRes, gpsPermsRes] = await Promise.all([
          fetch('/api/roles'),
          fetch('/api/permissions'),
          fetch('/api/gps/permissions'),
        ]);
        const rolesData = await rolesRes.json();
        const permsData = await permsRes.json();
        const gpsPermsData = await gpsPermsRes.json();
        
        // Сортируем роли в правильном порядке
        const roleOrder = ['SUPER_ADMIN', 'ADMIN', 'COACH', 'MEMBER', 'SCOUT', 'DOCTOR', 'DIRECTOR'];
        const sortedRoles = rolesData.sort((a: string, b: string) => {
          const aIndex = roleOrder.indexOf(a);
          const bIndex = roleOrder.indexOf(b);
          return aIndex - bIndex;
        });
        
        setRoles(sortedRoles);
        // Объединяем обычные разрешения с GPS разрешениями
        const allPermissions = [...permsData, ...gpsPermsData];
        setPermissions(allPermissions);
        
        // Проверяем, что данные не пустые
        if (sortedRoles.length === 0) {
          throw new Error('Не удалось загрузить роли');
        }
        if (permsData.length === 0) {
          throw new Error('Не удалось загрузить разрешения');
        }
        
        // Загружаем права для каждой роли
        const permsByRole: Record<string, RolePermission[]> = {};
        const rolePermsResults = await Promise.allSettled(
          sortedRoles.map(async (role: string) => {
            const [regularRes, gpsRes] = await Promise.all([
              fetch(`/api/roles/${role}/permissions`),
              fetch(`/api/gps/roles/${role}/permissions`)
            ]);
            
            if (!regularRes.ok) {
              throw new Error(`Ошибка загрузки обычных разрешений для роли ${role}`);
            }
            if (!gpsRes.ok) {
              throw new Error(`Ошибка загрузки GPS разрешений для роли ${role}`);
            }
            
            const regularPerms = await regularRes.json();
            const gpsPerms = await gpsRes.json();
            
            // Объединяем обычные и GPS разрешения
            const allPerms = [...regularPerms, ...gpsPerms];
            permsByRole[role] = allPerms;
            return { role, perms: allPerms };
          })
        );
        
        // Проверяем ошибки загрузки разрешений ролей
        const failedRolePerms = rolePermsResults.filter(result => result.status === 'rejected');
        if (failedRolePerms.length > 0) {
          const errorMessages = failedRolePerms.map(result => 
            result.status === 'rejected' ? result.reason.message : ''
          ).join(', ');
          throw new Error(errorMessages);
        }
        
        setRolePermissions(permsByRole);
      } catch (e) {
        setError(t('common.error_loading_data', 'Ошибка загрузки данных'));
        toast({
          title: t('common.error', 'Ошибка'),
          description: t('rolesPermissions.error_loading', 'Не удалось загрузить данные о ролях и разрешениях'),
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast, t]);

  const getAllowed = (id: string, role: string) => {
    if (!rolePermissions[role]) {
      console.warn(`Нет разрешений для роли ${role}`);
      return false;
    }
    const permission = rolePermissions[role].find(p => p.permissionId === id);
    if (!permission) {
      console.warn(`Разрешение ${id} не найдено для роли ${role}`);
      return false;
    }
    return permission.allowed;
  };

  const handleToggle = (id: string, role: string) => {
    if (!rolePermissions[role]) {
      console.error(`Нет разрешений для роли ${role}`);
      return;
    }
    
    const permissionIndex = rolePermissions[role].findIndex(p => p.permissionId === id);
    if (permissionIndex === -1) {
      console.error(`Разрешение ${id} не найдено для роли ${role}`);
      return;
    }
    
    setRolePermissions(prev => {
      const updated = prev[role].map((p, index) =>
        index === permissionIndex ? { ...p, allowed: !p.allowed } : p
      );
      return { ...prev, [role]: [...updated] };
    });
    
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setError('');
    try {
      const results = await Promise.allSettled(
        roles.map(async (role) => {
          // Разделяем разрешения на обычные и GPS
          const regularPerms = rolePermissions[role].filter(perm => 
            !perm.code.startsWith('gps.')
          );
          const gpsPerms = rolePermissions[role].filter(perm => 
            perm.code.startsWith('gps.')
          );

          // Сохраняем обычные разрешения
          const regularRes = await fetch(`/api/roles/${role}/permissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(regularPerms),
          });
          if (!regularRes.ok) {
            const errorData = await regularRes.json().catch(() => ({}));
            throw new Error(`Ошибка сохранения обычных разрешений для роли ${role}: ${errorData.error || regularRes.statusText}`);
          }

          // Сохраняем GPS разрешения
          const gpsRes = await fetch(`/api/gps/roles/${role}/permissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gpsPerms),
          });
          if (!gpsRes.ok) {
            const errorData = await gpsRes.json().catch(() => ({}));
            throw new Error(`Ошибка сохранения GPS разрешений для роли ${role}: ${errorData.error || gpsRes.statusText}`);
          }

          return { regularRes, gpsRes };
        })
      );
      
      const failedResults = results.filter(result => result.status === 'rejected');
      if (failedResults.length > 0) {
        const errorMessages = failedResults.map(result => 
          result.status === 'rejected' ? result.reason.message : ''
        ).join(', ');
        throw new Error(errorMessages);
      }
      
      toast({
        title: t('common.success', 'Успешно'),
        description: t('rolesPermissions.success_save', 'Права ролей обновлены'),
      });
      setHasChanges(false);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Неизвестная ошибка';
      setError(errorMessage);
      toast({
        title: t('common.error', 'Ошибка'),
        description: t('rolesPermissions.error_saving', 'Не удалось сохранить изменения'),
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Группируем разрешения по категориям
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const category = perm.code.split('.')[0];
    // Полностью исключаем роли из группировки разрешений
    const roleNames = ['director', 'super_admin', 'admin', 'coach', 'member', 'scout', 'doctor'];
    if (roleNames.includes(category.toLowerCase())) {
      // Если это роль, пропускаем это разрешение из отображения
      return acc;
    } else {
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(perm);
    }
    return acc;
  }, {} as Record<string, Permission[]>);

  // Сортируем разрешения внутри каждой категории
  Object.keys(groupedPermissions).forEach(category => {
    groupedPermissions[category].sort((a, b) => {
      // Сначала сортируем по типу действия (read, update, create, delete)
      const actionOrder = { read: 1, update: 2, create: 3, delete: 4 };
      const aAction = a.code.split('.')[1];
      const bAction = b.code.split('.')[1];
      const aOrder = actionOrder[aAction as keyof typeof actionOrder] || 5;
      const bOrder = actionOrder[bAction as keyof typeof actionOrder] || 5;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // Затем по описанию
      return (a.description || a.code).localeCompare(b.description || b.code);
    });
  });

  if (loading) {
    return (
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader>
          <CardTitle className="text-vista-light">{t('rolesPermissions.title', 'Права ролей')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-vista-primary" />
            <span className="ml-3 text-vista-light/70">{t('rolesPermissions.loading', 'Загрузка прав доступа...')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader>
          <CardTitle className="text-vista-light">{t('rolesPermissions.title', 'Права ролей')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <XMarkIcon className="h-12 w-12 text-vista-error mx-auto mb-4" />
              <p className="text-vista-error text-lg font-medium">{error}</p>
              <p className="text-vista-light/70 mt-2">{t('common.try_refresh', 'Попробуйте обновить страницу')}</p>
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-4 bg-vista-primary hover:bg-vista-primary/90"
              >
                Обновить страницу
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Проверяем, что есть данные для отображения
  if (roles.length === 0 || permissions.length === 0 || Object.keys(rolePermissions).length === 0) {
    return (
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader>
          <CardTitle className="text-vista-light">{t('rolesPermissions.title', 'Права ролей')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <XMarkIcon className="h-12 w-12 text-vista-light/30 mx-auto mb-4" />
              <p className="text-vista-light/70 text-lg">Нет данных для отображения</p>
              <p className="text-vista-light/50 mt-2">Роли или разрешения не найдены</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
      <CardHeader className="border-b border-vista-secondary/30">
        <CardTitle className="text-vista-light text-xl font-semibold">
          {t('rolesPermissions.management_title', 'Управление правами ролей')}
        </CardTitle>
        <p className="text-vista-light/70 text-sm mt-2">
          {t('rolesPermissions.description', 'Настройте права доступа для каждой роли в системе')}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto custom-scrollbar">
          <div className="min-w-full">
            {/* Заголовок таблицы */}
            <div className="sticky top-0 z-10 bg-vista-dark/90 backdrop-blur-sm border-b border-vista-secondary/50">
              <div className="grid grid-cols-[250px_repeat(auto-fit,minmax(100px,1fr))] gap-0">
                {/* Заголовок первой колонки */}
                <div className="p-3 border-r border-vista-secondary/30">
                  {/* Убираем заголовок "Права доступа" */}
                </div>
                {/* Заголовки ролей */}
                {roles.map(role => {
                  const roleLabel = getRoleLabel(role);
                  return (
                    <div key={role} className="p-3 border-r border-vista-secondary/30 last:border-r-0">
                      <div className="text-center">
                        <h3 className="text-vista-primary font-semibold text-xs uppercase tracking-wide leading-tight break-words">
                          {roleLabel}
                        </h3>
                        <p className="text-vista-light/50 text-xs mt-1 leading-tight">{role}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Содержимое таблицы */}
            <div className="divide-y divide-vista-secondary/20">
              {Object.entries(groupedPermissions).map(([category, perms]) => (
                <div key={category} className="bg-vista-dark/30">
                  {/* Заголовок категории */}
                  <div className="grid grid-cols-[250px_repeat(auto-fit,minmax(100px,1fr))] gap-0">
                    <div className="p-2 border-r border-vista-secondary/30 bg-vista-secondary/20">
                      <h4 className="text-vista-primary font-medium text-sm">
                        {(() => {
                          const categoryKey = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES];
                          if (categoryKey) {
                            return t(`dropdown.${categoryKey}`, category);
                          }
                          return category;
                        })()}
                      </h4>
                    </div>
                    {roles.map(role => (
                      <div key={role} className="p-2 border-r border-vista-secondary/30 last:border-r-0 bg-vista-secondary/20" />
                    ))}
                  </div>

                  {/* Разрешения в категории */}
                  {perms.map(perm => (
                    <div key={perm.id} className="grid grid-cols-[250px_repeat(auto-fit,minmax(100px,1fr))] gap-0 hover:bg-vista-secondary/10 transition-colors">
                      {/* Название разрешения */}
                      <div className="p-2 border-r border-vista-secondary/30">
                        <div className="flex items-center space-x-2">
                          <div className="flex-shrink-0">
                            {(() => {
                              const hasAnyAccess = roles.some(role => getAllowed(perm.id, role));
                              return hasAnyAccess ? (
                                <CheckIcon className="h-3 w-3 text-vista-success" />
                              ) : (
                                <XMarkIcon className="h-3 w-3 text-vista-light/30" />
                              );
                            })()}
                          </div>
                          <div>
                            <p className="text-vista-light text-xs font-medium leading-tight">
                              {perm.description || perm.code}
                            </p>
                            {/* Убираем подпись с кодом разрешения */}
                          </div>
                        </div>
                      </div>

                      {/* Переключатели для каждой роли */}
                      {roles.map(role => {
                        const isAllowed = getAllowed(perm.id, role);
                        return (
                          <div key={role} className="p-2 border-r border-vista-secondary/30 last:border-r-0 flex items-center justify-center">
                            <Switch
                              checked={isAllowed}
                              onCheckedChange={() => handleToggle(perm.id, role)}
                              className="data-[state=checked]:bg-vista-primary data-[state=unchecked]:bg-vista-secondary/50"
                              aria-label={`${perm.description} для роли ${getRoleLabel(role)}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Кнопка сохранения */}
        <div className="p-6 border-t border-vista-secondary/30 bg-vista-dark/30">
          <div className="flex items-center justify-between">
            <div className="text-sm text-vista-light/70">
              {saving 
                ? t('rolesPermissions.saving_changes', 'Сохранение изменений...') 
                : hasChanges
                ? t('rolesPermissions.save_hint', 'Нажмите "Сохранить все" для применения изменений')
                : 'Нет изменений для сохранения'
              }
            </div>
            <Button 
              onClick={handleSaveAll} 
              disabled={saving || !hasChanges}
              className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark font-semibold px-6 py-2 rounded-md shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('common.saving', 'Сохранение...')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('rolesPermissions.save_all', 'Сохранить все')}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RolesPermissionsTable; 