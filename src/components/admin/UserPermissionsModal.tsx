import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Permission {
  id: string;
  code: string;
  description: string;
}

interface UserPermission {
  permissionId: string;
  allowed: boolean;
  override: boolean;
  code: string;
  description: string;
}

interface UserPermissionsModalProps {
  userId: string;
  userName?: string;
  open: boolean;
  onClose: () => void;
}

const UserPermissionsModal: React.FC<UserPermissionsModalProps> = ({ userId, userName, open, onClose }) => {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/users/${userId}/permissions`)
      .then(res => res.json())
      .then(data => setPermissions(data))
      .catch(() => setError('Ошибка загрузки прав'))
      .finally(() => setLoading(false));
  }, [userId, open]);

  const handleCheckbox = (permissionId: string) => {
    setPermissions(prev => prev.map(p =>
      p.permissionId === permissionId
        ? { ...p, override: true, allowed: !p.allowed }
        : p
    ));
  };

  const handleReset = (permissionId: string) => {
    setPermissions(prev => prev.map(p =>
      p.permissionId === permissionId
        ? { ...p, override: false }
        : p
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // Отправляем только те права, где override=true
      const overrides = permissions.filter(p => p.override).map(p => ({ permissionId: p.permissionId, allowed: p.allowed }));
      const res = await fetch(`/api/users/${userId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrides),
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      onClose();
    } catch (e) {
      setError('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl !max-w-2xl !w-[700px] overflow-hidden backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-center mb-2 text-vista-light">
            Индивидуальные права {userName ? `для ${userName}` : ''}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="p-4 text-vista-light/70">Загрузка...</div>
        ) : error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">{error}</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto py-2 custom-scrollbar">
            {permissions.map(p => (
              <div key={p.permissionId} className="flex items-center gap-3 border-b border-vista-secondary/20 py-1 px-1">
                <label className="flex items-center gap-2 cursor-pointer w-full">
                  <input
                    type="checkbox"
                    checked={p.override ? p.allowed : undefined}
                    onChange={() => handleCheckbox(p.permissionId)}
                    aria-label={p.description || p.code}
                    className="accent-vista-primary w-4 h-4 rounded border border-vista-secondary/40 bg-vista-dark/70 focus:ring-0 focus:outline-none"
                  />
                  <span className="text-vista-light/90 text-sm" title={p.code}>{p.description || p.code}</span>
                </label>
                {p.override && (
                  <Button size="sm" variant="ghost" onClick={() => handleReset(p.permissionId)} className="text-vista-primary px-2 py-1">
                    Сбросить
                  </Button>
                )}
                {!p.override && <span className="text-xs text-vista-light/50 min-w-[130px] inline-block">(наследует от роли)</span>}
              </div>
            ))}
          </div>
        )}
        <DialogFooter className="flex justify-end gap-2 mt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark focus:outline-none focus:ring-0 px-6"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserPermissionsModal; 