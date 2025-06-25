import React, { RefObject } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl backdrop-blur-xl focus:outline-none focus:ring-0">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-center mb-2">Создать новый фитнес тест</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Название теста"
          className="form-input bg-vista-dark border-vista-secondary/50 text-vista-light focus:outline-none focus:ring-0"
          value={newTestName}
          onChange={e => setNewTestName(e.target.value)}
          disabled={loading}
        />
        <textarea
          placeholder="Описание теста (правила, детали и т.д.)"
          className="form-input bg-vista-dark border-vista-secondary/50 text-vista-light focus:outline-none focus:ring-0 min-h-[64px]"
          value={newTestDescription}
          onChange={e => setNewTestDescription(e.target.value)}
          disabled={loading}
        />
        <Select
          value={newTestType}
          onValueChange={setNewTestType}
          disabled={loading}
        >
          <SelectTrigger className="form-input bg-vista-dark border-vista-secondary/50 text-vista-light focus:outline-none focus:ring-0">
            <SelectValue placeholder="Выберите тип теста" />
          </SelectTrigger>
          <SelectContent side="bottom" className="bg-vista-dark border-vista-secondary/30 text-vista-light shadow-lg">
            {FITNESS_TEST_TYPES.filter(type => type.value !== 'other' && type.label !== 'Другое').map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={newTestUnit}
          onValueChange={setNewTestUnit}
          disabled={loading}
        >
          <SelectTrigger className="form-input bg-vista-dark border-vista-secondary/50 text-vista-light focus:outline-none focus:ring-0">
            <SelectValue placeholder="Выберите единицу измерения" />
          </SelectTrigger>
          <SelectContent
            side="bottom"
            hideScrollButtons={true}
            className="bg-vista-dark border-vista-secondary/30 text-vista-light shadow-lg max-h-48 overflow-y-auto custom-scrollbar"
          >
            <div
              ref={unitListRef}
              onScroll={handleUnitScroll}
              className="max-h-48 overflow-y-auto pr-1 custom-scrollbar"
            >
              {FITNESS_TEST_UNITS.map(unit => (
                <SelectItem key={unit.value} value={unit.value}>
                  <span>{unit.label}</span>
                  {unit.description && (
                    <span className="ml-1 text-xs text-vista-light/50">({unit.description})</span>
                  )}
                </SelectItem>
              ))}
            </div>
          </SelectContent>
        </Select>
        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
        <DialogFooter className="flex gap-2 mt-2">
          <Button
            variant="outline"
            className="w-1/2 border-vista-secondary/30 text-vista-light hover:bg-vista-light/10 hover:text-white focus:outline-none focus:ring-0"
            onClick={onCancel}
            disabled={loading}
          >
            Отмена
          </Button>
          <Button
            className="w-1/2 bg-vista-primary hover:bg-vista-primary/90 text-vista-dark focus:outline-none focus:ring-0"
            onClick={onSave}
            disabled={loading || !newTestName.trim()}
          >
            {loading ? "Создание..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
);

export default CreateFitnessTestModal; 