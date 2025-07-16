import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface AddPlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firstName: string;
  lastName: string;
  isSubmitting: boolean;
  formError: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddPlayerModal({
  open,
  onOpenChange,
  firstName,
  lastName,
  isSubmitting,
  formError,
  onChange,
  onSubmit,
}: AddPlayerModalProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md overflow-hidden backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl">{t('teamPage.add_player_modal_title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          {formError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
              {formError}
            </div>
          )}
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-vista-light/40 font-normal">
                {t('teamPage.first_name_label')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                name="firstName"
                value={firstName}
                onChange={onChange}
                className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
                placeholder={t('teamPage.first_name_placeholder')}
                disabled={isSubmitting}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-vista-light/40 font-normal">
                {t('teamPage.last_name_label')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                name="lastName"
                value={lastName}
                onChange={onChange}
                className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
                placeholder={t('teamPage.last_name_placeholder')}
                disabled={isSubmitting}
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0"
            >
              {t('teamPage.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark focus:outline-none focus:ring-0"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-vista-dark border-t-transparent rounded-full"></div>
                  {t('teamPage.saving')}
                </>
              ) : (
                t('teamPage.save')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 