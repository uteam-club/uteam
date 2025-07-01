'use client';

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { useClub } from '@/providers/club-provider';
import { toast } from '@/components/ui/use-toast';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import React from 'react';

const SURVEY_TEMPLATES = [
  {
    key: 'morning',
    title: 'Состояние утро',
    description: 'Опросник для ежедневного мониторинга состояния игроков',
  },
  // В будущем можно добавить другие шаблоны
];

export default function SurveysPage() {
  const router = useRouter();
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-vista-light">Шаблоны опросников</h1>
      </div>
      <div className="grid gap-6">
        {SURVEY_TEMPLATES.map(tmpl => (
          <Card key={tmpl.key} className="bg-vista-dark/50 border-vista-secondary/50 shadow-md flex flex-col md:flex-row items-center justify-between p-6">
              <div>
              <h2 className="text-xl font-semibold mb-2 text-vista-light">{tmpl.title}</h2>
              <p className="text-sm text-vista-light/70 mb-2">{tmpl.description}</p>
            </div>
            <Button onClick={() => router.push(`/dashboard/survey/${tmpl.key}`)}>
              Открыть шаблон
            </Button>
        </Card>
        ))}
      </div>
    </div>
  );
} 