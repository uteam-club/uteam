import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CountrySelect } from '@/components/ui/country-select';
import { TeamSelect } from '@/components/ui/team-select';
import DocumentUpload from '@/components/ui/document-upload';
import { useTranslation } from 'react-i18next';

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { name: string; email: string; role: string };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSave: () => void;
  onCancel: () => void;
  error?: string;
  loading?: boolean;
  roles: { value: string; label: string }[];
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ open, onOpenChange, user, onChange, onSave, onCancel, error, loading, roles }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md w-full overflow-hidden backdrop-blur-xl">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-center mb-2 text-vista-light">Редактировать пользователя</DialogTitle>
      </DialogHeader>
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">{error}</div>
      )}
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-vista-light/70 font-normal">Имя</Label>
          <Input id="name" name="name" value={user.name} onChange={onChange} className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light" placeholder="Введите имя" disabled={loading} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-vista-light/70 font-normal">Email</Label>
          <Input id="email" name="email" value={user.email} onChange={onChange} className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light" placeholder="Введите email" disabled={loading} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role" className="text-vista-light/70 font-normal">Роль</Label>
          <select id="role" name="role" value={user.role} onChange={onChange} className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light rounded-md px-3 py-2 w-full" disabled={loading}>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </div>
      </div>
      <DialogFooter className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onCancel} className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0" disabled={loading}>Отмена</Button>
        <Button onClick={onSave} className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark focus:outline-none focus:ring-0" disabled={loading}>{loading ? 'Сохранение...' : 'Сохранить'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  number?: number | null;
  position?: string | null;
  strongFoot?: string | null;
  dateOfBirth?: string | null;
  academyJoinDate?: string | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  nationality?: string | null;
  imageUrl?: string | null;
  birthCertificateNumber?: string | null;
  pinCode: string;
  teamId: string;
  telegramId?: number | null;
  passportData?: string | null;
  insuranceNumber?: string | null;
  visaExpiryDate?: string | null;
  middleName?: string | null;
}

interface EditPlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Player;
  teams: { id: string; name: string; teamType: 'academy' | 'contract' }[];
  documents: any[];
  onSave: (updatedPlayer: Player) => void;
  onDocumentUpload: (file: File, type: string) => Promise<{ imageUrl?: string }>;
  onDocumentDelete: (id: string) => Promise<void>;
}

export default function EditPlayerModal({ open, onOpenChange, player, teams, documents, onSave, onDocumentUpload, onDocumentDelete }: EditPlayerModalProps) {
  const [form, setForm] = useState<Player>(player);
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();

  // Определяем тип команды для выбранной команды
  const currentTeam = teams.find(t => t.id === form.teamId);
  const teamType = currentTeam?.teamType || 'academy';

  // DEBUG: Выводим в консоль для отладки
  console.log('EditPlayerModal teams:', teams);
  console.log('EditPlayerModal form.teamId:', form.teamId);

  const isSingleTeam = teams.length === 1;

  const handleChange = (field: keyof Player, value: any) => {
    setForm((prev: Player) => {
      const updated = { ...prev, [field]: value };
      console.log('form после изменения:', updated);
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const fixedForm = {
      ...form,
      visaExpiryDate: form.visaExpiryDate === '' ? null : form.visaExpiryDate,
    };
    await onSave(fixedForm);
    setSaving(false);
    onOpenChange(false);
  };

  const getDeleteHandler = (onDocumentDelete: (id: string) => Promise<void>, documents: any[], type: string) => {
    const doc = documents.find(doc => doc.type === type);
    return doc ? async () => await onDocumentDelete(doc.id) : undefined;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-vista-dark border-vista-secondary/30 text-vista-light max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-lg">{t('playerProfile.editModal.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Аватар игрока: сменить/удалить */}
          <div className="flex flex-col items-center mb-4">
            <img
              src={form.imageUrl || '/default-avatar.png'}
              alt="avatar"
              className="w-32 h-32 object-cover mb-2 border border-vista-secondary/30 rounded"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  // Триггерим выбор файла
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = async (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Загружаем аватар и получаем url
                      const result = await onDocumentUpload(file, 'AVATAR');
                      if (result && result.imageUrl) {
                        setForm((prev: Player) => ({ ...prev, imageUrl: result.imageUrl }));
                        // Сохраняем игрока с новым imageUrl
                        await onSave({ ...form, imageUrl: result.imageUrl });
                      }
                    }
                  };
                  input.click();
                }}
              >
                {t('playerProfile.editModal.replace_avatar')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  setForm((prev: Player) => ({ ...prev, imageUrl: null }));
                  await onSave({ ...form, imageUrl: null });
                }}
              >
                {t('playerProfile.editModal.delete_avatar')}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label className="text-vista-light/70 text-sm mb-2 block">{t('playerProfile.last_name')}</label>
              <Input value={form.lastName || ''} onChange={e => handleChange('lastName', e.target.value)} required />
            </div>
            <div>
              <label className="text-vista-light/70 text-sm mb-2 block">{t('playerProfile.middle_name')}</label>
              <Input value={form.middleName || ''} onChange={e => handleChange('middleName', e.target.value)} />
            </div>
            <div>
              <label className="text-vista-light/70 text-sm mb-2 block">{t('playerProfile.first_name')}</label>
              <Input value={form.firstName || ''} onChange={e => handleChange('firstName', e.target.value)} required />
            </div>
            <div>
              <label className="text-vista-light/70 text-sm mb-2 block">{t('playerProfile.number')}</label>
              <Input type="number" value={form.number || ''} onChange={e => handleChange('number', e.target.value)} onFocus={e => { if (e.target.value === '0') e.target.value = ''; }} />
            </div>
            <div>
              <label className="text-vista-light/70 text-sm mb-2 block">{t('playerProfile.position')}</label>
              <Select value={form.position || ''} onValueChange={v => handleChange('position', v)}>
                <SelectTrigger className="bg-vista-dark-lighter border-vista-secondary/30">
                  <SelectValue placeholder={t('playerProfile.editModal.position_placeholder')} />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/30">
                  <SelectItem value="goalkeeper">{t('playerProfile.position_goalkeeper')}</SelectItem>
                  <SelectItem value="defender">{t('playerProfile.position_defender')}</SelectItem>
                  <SelectItem value="midfielder">{t('playerProfile.position_midfielder')}</SelectItem>
                  <SelectItem value="forward">{t('playerProfile.position_forward')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-vista-light/70 text-sm mb-2 block">{t('playerProfile.strong_foot')}</label>
              <Select value={form.strongFoot || ''} onValueChange={v => handleChange('strongFoot', v)}>
                <SelectTrigger className="bg-vista-dark-lighter border-vista-secondary/30">
                  <SelectValue placeholder={t('playerProfile.editModal.strong_foot_placeholder')} />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/30">
                  <SelectItem value="right">{t('playerProfile.strong_foot_right')}</SelectItem>
                  <SelectItem value="left">{t('playerProfile.strong_foot_left')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-vista-light/70 text-sm mb-2 block">{t('playerProfile.nationality')}</label>
              <CountrySelect value={form.nationality || ''} onChange={v => handleChange('nationality', v)} />
            </div>
            <div>
              <label className="text-vista-light/70 text-sm mb-2 block">{t('playerProfile.birth_date')}</label>
              <Input type="date" value={form.dateOfBirth ? String(form.dateOfBirth).slice(0,10) : ''} onChange={e => handleChange('dateOfBirth', e.target.value)} />
            </div>
            {teamType === 'academy' ? (
              <div>
                <label className="text-vista-light/70 text-sm mb-2 block">{t('playerProfile.editModal.academy_join_date')}</label>
                <Input type="date" value={form.academyJoinDate ? String(form.academyJoinDate).slice(0,10) : ''} onChange={e => handleChange('academyJoinDate', e.target.value)} placeholder={t('playerProfile.editModal.date_placeholder')} />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-vista-light/70 text-sm mb-2 block">{t('playerProfile.editModal.contract_start')}</label>
                  <Input type="date" value={form.contractStartDate ? String(form.contractStartDate).slice(0,10) : ''} onChange={e => handleChange('contractStartDate', e.target.value)} />
                </div>
                <div>
                  <label className="text-vista-light/70 text-sm mb-2 block">{t('playerProfile.editModal.contract_end')}</label>
                  <Input type="date" value={form.contractEndDate ? String(form.contractEndDate).slice(0,10) : ''} onChange={e => handleChange('contractEndDate', e.target.value)} />
                </div>
              </>
            )}
            {!isSingleTeam && (
              <>
                <div>
                  <label className="text-vista-light/70 text-sm mb-2 block">{t('playerProfile.editModal.change_team')}</label>
                  {teams.length === 0 ? (
                    <div className="flex items-center gap-2 text-vista-light/60 text-sm bg-vista-dark/40 rounded px-3 py-2 border border-vista-secondary/30">
                      <svg className="animate-spin h-4 w-4 mr-2 text-vista-primary" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                      {t('playerProfile.editModal.loading_teams')}
                    </div>
                  ) : (
                    <TeamSelect
                      teams={teams}
                      value={form.teamId || ''}
                      onChange={v => {
                        console.log('Выбрана команда:', v);
                        handleChange('teamId', v);
                      }}
                      placeholder={t('playerProfile.editModal.change_team_placeholder')}
                    />
                  )}
                </div>
              </>
            )}
            <div>
              <label className="text-vista-light/70 text-sm mb-2 block">{t('playerProfile.pin_code')}</label>
              <Input value={form.pinCode || ''} disabled />
            </div>
          </div>
          <div className="mt-8">
            <label className="text-vista-light/70 text-sm mb-3 block">{t('playerProfile.editModal.player_documents')}</label>
            <div className="grid grid-cols-1 gap-4">
              {/* Паспорт */}
              <div className="flex flex-col gap-1">
                <span className="text-vista-light/60 text-xs mb-1">{t('playerProfile.passport')}</span>
                <div className="flex items-center gap-2">
                  <Input
                    className="flex-1 min-w-0"
                    placeholder={t('playerProfile.passport_placeholder')}
                    value={form.passportData || ''}
                    onChange={e => handleChange('passportData', e.target.value)}
                  />
                  <DocumentUpload
                    onUpload={async (file, type) => { await onDocumentUpload(file, type); }}
                    onDelete={getDeleteHandler(onDocumentDelete, documents, 'PASSPORT')}
                    documentType="PASSPORT"
                    documentName={documents.find(doc => doc.type === 'PASSPORT')?.name}
                    documentId={documents.find(doc => doc.type === 'PASSPORT')?.id}
                    isUploaded={documents.some(doc => doc.type === 'PASSPORT')}
                    className="h-10 w-28"
                    buttonLabel="Загрузить"
                    buttonWidth="112px"
                  />
                </div>
              </div>
              {/* Свидетельство о рождении */}
              <div className="flex flex-col gap-1">
                <span className="text-vista-light/60 text-xs mb-1">{t('playerProfile.birth_certificate')}</span>
                <div className="flex items-center gap-2">
                  <Input
                    className="flex-1 min-w-0"
                    placeholder={t('playerProfile.birth_certificate_placeholder')}
                    value={form.birthCertificateNumber || ''}
                    onChange={e => handleChange('birthCertificateNumber', e.target.value)}
                  />
                  <DocumentUpload
                    onUpload={async (file, type) => { await onDocumentUpload(file, type); }}
                    onDelete={getDeleteHandler(onDocumentDelete, documents, 'BIRTH_CERTIFICATE')}
                    documentType="BIRTH_CERTIFICATE"
                    documentName={documents.find(doc => doc.type === 'BIRTH_CERTIFICATE')?.name}
                    documentId={documents.find(doc => doc.type === 'BIRTH_CERTIFICATE')?.id}
                    isUploaded={documents.some(doc => doc.type === 'BIRTH_CERTIFICATE')}
                    className="h-10 w-28"
                    buttonLabel="Загрузить"
                    buttonWidth="112px"
                  />
                </div>
              </div>
              {/* Медицинская страховка */}
              <div className="flex flex-col gap-1">
                <span className="text-vista-light/60 text-xs mb-1">{t('playerProfile.medical_insurance')}</span>
                <div className="flex items-center gap-2">
                  <Input
                    className="flex-1 min-w-0"
                    placeholder={t('playerProfile.medical_insurance_placeholder')}
                    value={form.insuranceNumber || ''}
                    onChange={e => handleChange('insuranceNumber', e.target.value)}
                  />
                  <DocumentUpload
                    onUpload={async (file, type) => { await onDocumentUpload(file, type); }}
                    onDelete={getDeleteHandler(onDocumentDelete, documents, 'MEDICAL_INSURANCE')}
                    documentType="MEDICAL_INSURANCE"
                    documentName={documents.find(doc => doc.type === 'MEDICAL_INSURANCE')?.name}
                    documentId={documents.find(doc => doc.type === 'MEDICAL_INSURANCE')?.id}
                    isUploaded={documents.some(doc => doc.type === 'MEDICAL_INSURANCE')}
                    className="h-10 w-28"
                    buttonLabel="Загрузить"
                    buttonWidth="112px"
                  />
                </div>
              </div>
              {/* Виза */}
              <div className="flex flex-col gap-1">
                <span className="text-vista-light/60 text-xs mb-1">{t('playerProfile.visa')}</span>
                <div className="flex items-center gap-2">
                  <span className="text-vista-light/60 text-xs mb-1">{t('playerProfile.visa_expiry_date')}</span>
                  <Input
                    className="flex-1 min-w-0 text-xs"
                    type="date"
                    value={form.visaExpiryDate ? String(form.visaExpiryDate).slice(0,10) : ''}
                    onChange={e => handleChange('visaExpiryDate', e.target.value)}
                  />
                  <DocumentUpload
                    onUpload={async (file, type) => { await onDocumentUpload(file, type); }}
                    onDelete={getDeleteHandler(onDocumentDelete, documents, 'VISA')}
                    documentType="VISA"
                    documentName={documents.find(doc => doc.type === 'VISA')?.name}
                    documentId={documents.find(doc => doc.type === 'VISA')?.id}
                    isUploaded={documents.some(doc => doc.type === 'VISA')}
                    className="h-10 w-28"
                    buttonLabel="Загрузить"
                    buttonWidth="112px"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button type="submit" className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark" disabled={saving}>
              {saving ? t('playerProfile.editModal.saving') : t('playerProfile.editModal.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 