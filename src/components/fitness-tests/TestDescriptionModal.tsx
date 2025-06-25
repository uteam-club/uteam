import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import React, { useState } from 'react';

interface TestDescriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
}

export const TestDescriptionModal: React.FC<TestDescriptionModalProps> = ({ open, onOpenChange, description }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md w-full overflow-hidden backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-center mb-2 text-vista-light">Описание теста</DialogTitle>
        </DialogHeader>
        <div className="py-4 text-vista-light/80 whitespace-pre-line min-h-[64px]">
          {description ? description : <span className="text-vista-light/40">Нет описания</span>}
        </div>
        <DialogFooter className="flex justify-end mt-4 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0">Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 