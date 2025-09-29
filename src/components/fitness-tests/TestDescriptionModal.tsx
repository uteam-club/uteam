import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface TestDescriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
}

export const TestDescriptionModal: React.FC<TestDescriptionModalProps> = ({ open, onOpenChange, description }) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md overflow-y-auto max-h-[80vh] focus:outline-none focus:ring-0 custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-center mb-2">{t('fitnessTest.test_description_modal_title')}</DialogTitle>
        </DialogHeader>
        <div className="py-4 text-vista-light/80 whitespace-pre-line min-h-[64px]">
          {description ? description : <span className="text-vista-light/40">{t('fitnessTest.no_description')}</span>}
        </div>
        <DialogFooter className="flex justify-end mt-4 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-3 font-normal"
          >
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 