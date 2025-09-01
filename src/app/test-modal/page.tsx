'use client';

import { useState } from 'react';
import { MorningSurveyRecipientsModal } from '@/components/surveys/MorningSurveyRecipientsModal';
import { Button } from '@/components/ui/button';

export default function TestModalPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Тест модалки получателей</h1>
      
      <Button onClick={() => setIsOpen(true)}>
        Открыть модалку
      </Button>

      <MorningSurveyRecipientsModal
        open={isOpen}
        onOpenChange={setIsOpen}
        teamId="test-team-id"
        teamName="Тестовая команда"
        onRecipientsUpdate={() => {
          console.log('Recipients updated');
        }}
      />
    </div>
  );
}
