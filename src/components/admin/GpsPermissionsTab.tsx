'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
// import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, RefreshCw } from 'lucide-react';

interface GpsPermission {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
}

interface RolePermission {
  role: string;
  permissionId: string;
  allowed: boolean;
}

interface GpsPermissionsTabProps {
  className?: string;
}

const ROLE_NAMES: Record<string, string> = {
  'SUPER_ADMIN': 'Супер Админ',
  'ADMIN': 'Админ',
  'COACH': 'Тренер',
  'DOCTOR': 'Врач',
  'DIRECTOR': 'Директор',
  'SCOUT': 'Скаут',
  'MEMBER': 'Участник'
};

const CATEGORY_NAMES: Record<string, string> = {
  'reports': 'Отчеты',
  'profiles': 'Профили',
  'data': 'Данные',
  'admin': 'Администрирование'
};

export function GpsPermissionsTab({ className }: GpsPermissionsTabProps) {
  // const { toast } = useToast();
  const [permissions, setPermissions] = useState<GpsPermission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      
      // Загружаем разрешения
      const permissionsResponse = await fetch('/api/gps/permissions');
      if (!permissionsResponse.ok) {
        throw new Error('Failed to load permissions');
      }
      const permissionsData = await permissionsResponse.json();
      setPermissions(permissionsData);

      // Загружаем разрешения ролей
      const roles = Object.keys(ROLE_NAMES);
      const rolePermissionsData: Record<string, Record<string, boolean>> = {};

      for (const role of roles) {
        try {
          const roleResponse = await fetch(`/api/gps/roles/${role}/permissions`);
          if (roleResponse.ok) {
            const roleData = await roleResponse.json();
            rolePermissionsData[role] = roleData.permissions || {};
          } else {
            rolePermissionsData[role] = {};
          }
        } catch (error) {
          console.warn(`Failed to load permissions for role ${role}:`, error);
          rolePermissionsData[role] = {};
        }
      }

      setRolePermissions(rolePermissionsData);
    } catch (error) {
      console.error('Error loading permissions:', error);
      console.error('Не удалось загрузить GPS разрешения');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (role: string, permissionCode: string, allowed: boolean) => {
    setRolePermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permissionCode]: allowed
      }
    }));
  };

  const savePermissions = async () => {
    try {
      setSaving(true);
      
      for (const [role, permissions] of Object.entries(rolePermissions)) {
        const response = await fetch(`/api/gps/roles/${role}/permissions`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ permissions }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save permissions for role ${role}`);
        }
      }

      console.log('GPS разрешения сохранены');
    } catch (error) {
      console.error('Error saving permissions:', error);
      console.error('Не удалось сохранить GPS разрешения');
    } finally {
      setSaving(false);
    }
  };

  const getPermissionsByCategory = (category: string) => {
    return permissions.filter(p => p.category === category);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка GPS разрешений...</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">GPS Разрешения</h2>
          <p className="text-muted-foreground">
            Управление разрешениями для GPS функций
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadPermissions}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
          <Button
            onClick={savePermissions}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Сохранить
          </Button>
        </div>
      </div>

      {Object.entries(CATEGORY_NAMES).map(([categoryKey, categoryName]) => {
        const categoryPermissions = getPermissionsByCategory(categoryKey);
        
        if (categoryPermissions.length === 0) return null;

        return (
          <Card key={categoryKey} className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="secondary">{categoryName}</Badge>
                <span className="text-sm text-muted-foreground">
                  {categoryPermissions.length} разрешений
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryPermissions.map((permission) => (
                  <div key={permission.id} className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{permission.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {permission.description}
                        </p>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {permission.code}
                        </code>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(ROLE_NAMES).map(([role, roleName]) => (
                        <div key={role} className="flex items-center space-x-2">
                          <Switch
                            id={`${permission.id}-${role}`}
                            checked={rolePermissions[role]?.[permission.code] || false}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(role, permission.code, checked)
                            }
                          />
                          <Label 
                            htmlFor={`${permission.id}-${role}`}
                            className="text-sm font-medium"
                          >
                            {roleName}
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    <Separator />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {permissions.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                GPS разрешения не найдены
              </p>
              <Button onClick={loadPermissions}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Загрузить снова
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
