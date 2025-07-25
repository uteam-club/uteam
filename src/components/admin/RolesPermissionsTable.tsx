import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

export const RolesPermissionsTable: React.FC = () => {
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, RolePermission[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [rolesRes, permsRes] = await Promise.all([
          fetch('/api/roles'),
          fetch('/api/permissions'),
        ]);
        const rolesData = await rolesRes.json();
        const permsData = await permsRes.json();
        setRoles(rolesData);
        setPermissions(permsData);
        // Загружаем права для каждой роли
        const permsByRole: Record<string, RolePermission[]> = {};
        await Promise.all(
          rolesData.map(async (role: string) => {
            const res = await fetch(`/api/roles/${role}/permissions`);
            permsByRole[role] = await res.json();
          })
        );
        setRolePermissions(permsByRole);
      } catch (e) {
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getAllowed = (id: string, role: string) => {
    return rolePermissions[role]?.find(p => p.permissionId === id)?.allowed || false;
  };

  const handleCheckbox = (id: string, role: string) => {
    setRolePermissions(prev => {
      const updated = prev[role].map(p =>
        p.permissionId === id ? { ...p, allowed: !p.allowed } : p
      );
      return { ...prev, [role]: [...updated] };
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setError('');
    try {
      await Promise.all(
        roles.map(async (role) => {
          const res = await fetch(`/api/roles/${role}/permissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rolePermissions[role]),
          });
          if (!res.ok) throw new Error('Ошибка сохранения');
        })
      );
    } catch (e) {
      setError('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Загрузка...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Права ролей</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1 text-left">Права</th>
                {roles.map(role => (
                  <th key={role} className="border px-2 py-1 text-center">{role}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map(perm => {
                const permId = perm.id;
                return (
                  <tr key={permId}>
                    <td className="border px-2 py-1 font-medium" title={perm.code}>
                      {perm.description || perm.code}
                    </td>
                    {roles.map(role => {
                      const cellKey = permId + '-' + role;
                      return (
                        <td key={cellKey} className="border px-2 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={getAllowed(permId, role)}
                            onChange={() => handleCheckbox(permId, role)}
                            aria-label={perm.description || perm.code}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSaveAll} disabled={saving}>
              Сохранить все
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RolesPermissionsTable; 