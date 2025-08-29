import React, { RefObject } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useTranslation } from 'react-i18next';

interface FitnessTestType {
  value: string;
  label: string;
}
interface FitnessTestUnit {
  value: string;
  label: string;
  description?: string;
}

interface CreateFitnessTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newTestName: string;
  setNewTestName: (v: string) => void;
  newTestType: string;
  setNewTestType: (v: string) => void;
  newTestUnit: string;
  setNewTestUnit: (v: string) => void;
  error: string | null;
  loading: boolean;
  onSave: () => void;
  onCancel: () => void;
  FITNESS_TEST_TYPES: FitnessTestType[];
  FITNESS_TEST_UNITS: FitnessTestUnit[];
  unitListRef: RefObject<HTMLDivElement>;
  handleUnitScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  newTestDescription: string;
  setNewTestDescription: (v: string) => void;
}

const CreateFitnessTestModal: React.FC<CreateFitnessTestModalProps> = ({
  open,
  onOpenChange,
  newTestName,
  setNewTestName,
  newTestType,
  setNewTestType,
  newTestUnit,
  setNewTestUnit,
  error,
  loading,
  onSave,
  onCancel,
  FITNESS_TEST_TYPES,
  FITNESS_TEST_UNITS,
  unitListRef,
  handleUnitScroll,
  newTestDescription,
  setNewTestDescription,
}) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md overflow-y-auto max-h-[80vh] focus:outline-none focus:ring-0 custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-center mb-2">
            {t('fitnessTest.create_modal_title')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder={t('fitnessTest.test_name_placeholder')}
            className="bg-vista-dark border border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0 h-9 px-3 rounded-md"
            value={newTestName}
            onChange={e => setNewTestName(e.target.value)}
            disabled={loading}
          />
          <textarea
            placeholder={t('fitnessTest.test_description_placeholder')}
            className="bg-vista-dark border border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0 min-h-[64px] px-3 py-2 rounded-md"
            value={newTestDescription}
            onChange={e => setNewTestDescription(e.target.value)}
            disabled={loading}
          />
          <Select
            value={newTestType}
            onValueChange={setNewTestType}
            disabled={loading}
          >
            <SelectTrigger className="bg-vista-dark border border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0 h-9 px-3 rounded-md">
              <SelectValue placeholder={t('fitnessTest.select_type_placeholder')} />
            </SelectTrigger>
            <SelectContent side="bottom" className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-lg">
              {FITNESS_TEST_TYPES.filter(type => type.value !== 'other').map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {t(`fitnessTest.type.${type.value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={newTestUnit}
            onValueChange={setNewTestUnit}
            disabled={loading}
          >
            <SelectTrigger className="bg-vista-dark border border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0 h-9 px-3 rounded-md">
              <SelectValue placeholder={t('fitnessTest.select_unit_placeholder')} />
            </SelectTrigger>
            <SelectContent
              side="bottom"
              hideScrollButtons={true}
              className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-lg max-h-48 overflow-y-auto custom-scrollbar"
            >
              <div
                ref={unitListRef}
                onScroll={handleUnitScroll}
                className="max-h-48 overflow-y-auto pr-1 custom-scrollbar"
              >
                {FITNESS_TEST_UNITS.map(unit => (
                  <SelectItem key={unit.value} value={unit.value}>
                    <span>{t(`fitnessTest.unit.${unit.value}`)}</span>
                    <span className="ml-1 text-xs text-vista-light/50">({t(`fitnessTest.unit.${unit.value}_desc`)})</span>
                  </SelectItem>
                ))}
              </div>
            </SelectContent>
          </Select>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-3 font-normal"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={onSave}
              disabled={loading || !newTestName.trim()}
              className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
            >
              {loading ? t('common.creating') : t('common.save')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFitnessTestModal; 