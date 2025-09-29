'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { RPESurveyAnalysis } from './RPESurveyAnalysis';
import { RPESchedulingModal } from './RPESchedulingModal';
import { RPESurveyRecipientsModal } from './RPESurveyRecipientsModal';

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

  // Состояние для модала выбора получателей RPE
  const [isRecipientsModalOpen, setIsRecipientsModalOpen] = useState(false);
  const [selectedTeamForRecipients, setSelectedTeamForRecipients] = useState<{ id: string; name: string } | null>(null);

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


  // Открыть модал планирования RPE
  const handleOpenScheduling = (team: Team) => {
    setSelectedTeamForScheduling({ id: team.id, name: team.name });
    setIsSchedulingModalOpen(true);
  };

  // Открыть модал выбора получателей RPE
  const handleOpenRecipientsModal = (team: Team) => {
    setSelectedTeamForRecipients({ id: team.id, name: team.name });
    setIsRecipientsModalOpen(true);
  };

  return (
    <div className="p-0 md:p-6 bg-vista-dark/60 border border-vista-secondary/30 rounded-lg mb-6">
      <div className="flex flex-row items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-vista-light">{t('morningSurveyTabs.settings_title')}</h3>
        <div className="flex gap-2">
          <Dialog open={showInstruction} onOpenChange={setShowInstruction}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full sm:w-[200px] bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 px-3 font-normal text-sm shadow-lg"
                onClick={() => setShowInstruction(true)}
              >
                {t('morningSurveyTabs.instruction')}
              </Button>
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
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {teams.map(team => {
          return (
            <div key={team.id} className="bg-vista-dark/30 border border-vista-secondary/20 rounded-lg p-4 hover:bg-vista-secondary/10 transition-colors">
              <div className="space-y-3">
                {/* Название команды */}
                <h3 className="text-vista-light font-medium text-sm text-center">{team.name}</h3>
                
                {/* Кнопки действий */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full h-9 bg-transparent border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 px-3 font-normal text-sm"
                    onClick={() => handleOpenScheduling(team)}
                    disabled={loading}
                  >
                    Запланировать рассылки
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full px-3 py-0.5 rounded bg-vista-secondary/10 text-vista-light/40 hover:bg-vista-accent hover:text-white disabled:opacity-60 border border-vista-secondary/20 text-xs transition-colors opacity-70 hover:opacity-100"
                    onClick={() => handleOpenRecipientsModal(team)}
                    disabled={loading}
                  >
                        Получатели
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
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

      {/* Модал выбора получателей RPE */}
      <RPESurveyRecipientsModal
        open={isRecipientsModalOpen}
        onOpenChange={setIsRecipientsModalOpen}
        teamId={selectedTeamForRecipients?.id || ''}
        teamName={selectedTeamForRecipients?.name || ''}
        onRecipientsUpdate={() => {
          toast({ title: 'Получатели RPE обновлены', variant: 'default' });
        }}
      />
    </div>
  );
}

export function RPESurveyTabsWrapper() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('analysis');

  return (
    <div className="w-full">
      <div className="grid w-full grid-cols-2 gap-2">
        <Button
          variant="outline"
          className={`flex items-center gap-2 h-8 px-3 text-sm font-normal transition-none ${
            activeTab === 'analysis'
              ? 'bg-vista-primary/15 text-vista-primary border-vista-primary'
              : 'bg-transparent text-vista-light/60 border-vista-light/20 hover:bg-vista-light/10 hover:text-vista-light hover:border-vista-light/40'
          }`}
          onClick={() => setActiveTab('analysis')}
        >
          {t('morningSurveyTabs.analysis')}
        </Button>
        <Button
          variant="outline"
          className={`flex items-center gap-2 h-8 px-3 text-sm font-normal transition-none ${
            activeTab === 'settings'
              ? 'bg-vista-primary/15 text-vista-primary border-vista-primary'
              : 'bg-transparent text-vista-light/60 border-vista-light/20 hover:bg-vista-light/10 hover:text-vista-light hover:border-vista-light/40'
          }`}
          onClick={() => setActiveTab('settings')}
        >
          {t('morningSurveyTabs.settings')}
        </Button>
      </div>
      
      {/* Контент вкладок */}
      <div className="mt-6">
        {activeTab === 'analysis' && <RPESurveyAnalysis />}
        {activeTab === 'settings' && <TelegramBotSettings type="rpe" />}
      </div>
    </div>
  );
}
