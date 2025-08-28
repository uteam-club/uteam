'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { RPESurveyAnalysis } from './RPESurveyAnalysis';
import { RPESchedulingModal } from './RPESchedulingModal';

interface Team {
  id: string;
  name: string;
  clubId: string;
}

function TelegramBotSettings({ type = 'rpe' }: { type?: 'morning' | 'rpe' }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [showInstruction, setShowInstruction] = useState(false);
  
  // Состояние для модала планирования RPE (только для type === 'rpe')
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [selectedTeamForScheduling, setSelectedTeamForScheduling] = useState<{ id: string; name: string } | null>(null);

  // Загрузка всех команд и их расписаний рассылки
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const teamsRes = await fetch('/api/teams');
        const teamsData = await teamsRes.json();
        setTeams(teamsData);
        const schedRes = await fetch(`/api/survey/schedules?type=${type}`);
        const schedData = await schedRes.json();
        setSchedules(schedData);
      } catch (e) {
        toast({ title: 'Ошибка', description: 'Ошибка загрузки данных', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Тестовая рассылка
  const handleTestBroadcast = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/telegram/test-broadcast?type=${type}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Тестовая рассылка выполнена', variant: 'default' });
      } else {
        toast({ title: 'Ошибка', description: data.error || 'Ошибка тестовой рассылки', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Ошибка', description: 'Ошибка тестовой рассылки', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Открыть модал планирования RPE
  const handleOpenScheduling = (team: Team) => {
    setSelectedTeamForScheduling({ id: team.id, name: team.name });
    setIsSchedulingModalOpen(true);
  };

  return (
    <div className="p-0 md:p-6 bg-vista-dark/60 border border-vista-secondary/30 rounded-lg mb-6">
      <div className="flex flex-row items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-vista-light">{t('morningSurveyTabs.settings_title')}</h3>
        <div className="flex gap-2">
          <Dialog open={showInstruction} onOpenChange={setShowInstruction}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20" onClick={() => setShowInstruction(true)}>{t('morningSurveyTabs.instruction')}</Button>
            </DialogTrigger>
            <DialogContent className="p-0 bg-transparent border-none shadow-none">
              <div className="bg-vista-dark/90 border-vista-secondary/30 shadow-xl rounded-lg p-6">
                <h4 className="text-vista-light text-lg font-bold mb-2">{t('morningSurveyTabs.instruction_title')}</h4>
                <ol className="list-decimal list-inside text-vista-light/80 mb-4 space-y-1">
                  <li>{t('morningSurveyTabs.instruction_step1')}</li>
                  <li>{t('morningSurveyTabs.instruction_step2')}</li>
                  <li>{t('morningSurveyTabs.instruction_step3')}</li>
                </ol>
                <div className="flex justify-end">
                  <DialogClose asChild>
                    <Button variant="outline" className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20">{t('morningSurveyTabs.close')}</Button>
                  </DialogClose>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={handleTestBroadcast} disabled={loading} className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark rounded-md px-4 py-2 text-sm font-semibold shadow">
            {t('morningSurveyTabs.test_broadcast')}
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-vista-secondary/30">
              <th className="px-4 py-2 text-left text-xs text-vista-light/70 font-semibold">{t('morningSurveyTabs.team')}</th>
              <th className="px-4 py-2 text-left text-xs text-vista-light/70 font-semibold">Статус расписания</th>
              <th className="px-4 py-2 text-left text-xs text-vista-light/70 font-semibold">Действия</th>
            </tr>
          </thead>
          <tbody>
            {teams.map(team => {
              return (
                <tr key={team.id} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10">
                  <td className="px-4 py-2 text-vista-light font-medium text-sm">{team.name}</td>
                  <td className="px-4 py-2">
                    <span className="text-vista-light/60 text-sm">
                      Настраивается индивидуально для каждой тренировки
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Button
                      size="sm"
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark rounded-md px-4 py-2 text-sm font-semibold shadow"
                      onClick={() => handleOpenScheduling(team)}
                      disabled={loading}
                    >
                      Запланировать рассылки
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Модал планирования RPE */}
      <RPESchedulingModal
        open={isSchedulingModalOpen}
        onOpenChange={setIsSchedulingModalOpen}
        team={selectedTeamForScheduling}
        onScheduleUpdated={() => {
          toast({ title: 'Расписание обновлено', variant: 'default' });
        }}
      />
    </div>
  );
}

export function RPESurveyTabsWrapper() {
  const { t } = useTranslation();

  return (
    <Tabs defaultValue="analysis" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-vista-dark/50 border border-vista-secondary/30">
        <TabsTrigger 
          value="analysis" 
          className="data-[state=active]:bg-vista-secondary/50 data-[state=active]:text-vista-light text-vista-light/70"
        >
          {t('morningSurveyTabs.analysis')}
        </TabsTrigger>
        <TabsTrigger 
          value="settings" 
          className="data-[state=active]:bg-vista-secondary/50 data-[state=active]:text-vista-light text-vista-light/70"
        >
          {t('morningSurveyTabs.settings')}
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="analysis">
        <RPESurveyAnalysis />
      </TabsContent>
      
      <TabsContent value="settings">
        <TelegramBotSettings type="rpe" />
      </TabsContent>
    </Tabs>
  );
}
