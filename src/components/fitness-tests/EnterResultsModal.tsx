import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FITNESS_TEST_UNITS } from '@/lib/constants';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/date-utils';

interface Team {
  id: string;
  name: string;
}
interface Player {
  id: string;
  firstName: string;
  lastName: string;
  number?: number;
  position?: string;
}
interface FitnessTestResult {
  id: string;
  playerId: string;
  value: string;
  date: string;
  createdBy: string;
}

interface EnterResultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  testName: string;
  testUnit: string;
  teamId: string;
  onSaved?: () => void;
}

const EnterResultsModal: React.FC<EnterResultsModalProps> = ({ open, onOpenChange, testId, testName, testUnit, teamId, onSaved }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [results, setResults] = useState<FitnessTestResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [editResults, setEditResults] = useState<{ [playerId: string]: string }>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [date, setDate] = useState<string>('');
  const [dateLoading, setDateLoading] = useState(false);
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'ru';

  useEffect(() => {
    if (open && teamId) {
      fetchPlayers(teamId);
      fetchResults(teamId);
      setEditResults({});
      setSaveError(null);
      setDate('');
    }
  }, [open, teamId]);

  // Добавляем эффект для загрузки результатов при изменении даты
  useEffect(() => {
    if (date && results.length > 0) {
      setDateLoading(true);
      // Фильтруем результаты по выбранной дате
      const resultsForDate = results.filter(result => {
        const resultDate = new Date(result.date).toISOString().split('T')[0];
        return resultDate === date;
      });
      
      // Заполняем поля существующими результатами
      const existingResults: { [playerId: string]: string } = {};
      resultsForDate.forEach(result => {
        existingResults[result.playerId] = result.value;
      });
      
      setEditResults(existingResults);
      setDateLoading(false);
    }
  }, [date, results]);

  async function fetchPlayers(teamId: string) {
    setPlayersLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/players`);
      const data = await res.json();
      setPlayers(Array.isArray(data) ? data : []);
    } catch {
      setPlayers([]);
    } finally {
      setPlayersLoading(false);
    }
  }

  async function fetchResults(teamId: string) {
    setResultsLoading(true);
    try {
      const res = await fetch(`/api/fitness-tests/results?testId=${testId}&teamId=${teamId}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setResultsLoading(false);
    }
  }

  const handleResultChange = (playerId: string, value: string) => {
    const normalized = value.replace(',', '.');
    setEditResults(prev => ({ ...prev, [playerId]: normalized }));
  };

  async function handleSaveResults() {
    setSaveLoading(true);
    setSaveError(null);
    try {
      // Отправляем результаты для ВСЕХ игроков, включая пустые поля
      // API будет удалять результаты для игроков с пустыми полями
      const resultsToSend = players.map(p => ({
        playerId: p.id,
        value: editResults[p.id] || '', // Пустая строка для игроков без результатов
        date
      }));
      const res = await fetch('/api/fitness-tests/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId,
          teamId,
          results: resultsToSend,
        }),
      });
      if (!res.ok) {
        setSaveError('Ошибка при сохранении результатов');
        setSaveLoading(false);
        return;
      }
      if (onSaved) onSaved();
      onOpenChange(false);
    } catch {
      setSaveError('Ошибка при сохранении результатов');
    } finally {
      setSaveLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md max-h-[80vh] focus:outline-none focus:ring-0 flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-center mb-2">
            {t('fitnessTest.enter_results_modal_title', { testName })}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="flex items-center justify-between">
            <label className="text-vista-light/40 font-normal whitespace-nowrap">{t('fitnessTest.test_date_label')}</label>
            <input
              type="date"
              className="bg-vista-dark border border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0 h-9 px-3 rounded-md w-40 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:saturate-100 [&::-webkit-calendar-picker-indicator]:hue-rotate-180"
              value={date}
              onChange={e => setDate(e.target.value)}
              disabled={dateLoading}
            />
          </div>
          {playersLoading || resultsLoading ? (
            <div className="text-vista-light/70 text-center py-8">{t('common.loading')}</div>
          ) : players.length === 0 ? (
            <div className="text-vista-light/70 text-center py-8">{t('fitnessTest.no_players')}</div>
          ) : (
            <>
              {date && editResults && Object.keys(editResults).length > 0 && (
                <div className="text-xs text-vista-light/60 text-center py-2 bg-vista-secondary/10 rounded border border-vista-secondary/20">
                  Загружены существующие результаты для выбранной даты
                </div>
              )}
              <div className="text-xs text-vista-light/50 text-center py-1 bg-amber-500/10 rounded border border-amber-500/20">
                ⚠️ Пустые поля будут удалены из результатов
              </div>
              <div className="overflow-y-auto flex-1 flex flex-col custom-scrollbar min-h-0">
                {players.map((player, index) => (
                  <div key={player.id}>
                    <div className="flex items-center gap-2 py-2">
                      <div className="flex-1 truncate text-vista-light/80">{player.lastName} {player.firstName}</div>
                      <div className="flex items-end gap-1">
                        <input
                          type="number"
                          className="bg-vista-dark border border-vista-secondary/50 text-vista-light focus:outline-none focus:ring-0 h-9 px-3 rounded-md w-20"
                          value={editResults[player.id] ?? ''}
                          onChange={e => handleResultChange(player.id, e.target.value)}
                          onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                        />
                        <span className="text-vista-light/50 text-xs font-normal min-w-0 mb-1">
                          {testUnit ? (FITNESS_TEST_UNITS.find(u => u.value === testUnit)?.label[lang] || testUnit) : ''}
                        </span>
                      </div>
                    </div>
                    {index < players.length - 1 && (
                      <div className="border-b border-vista-secondary/20"></div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          {saveError && <div className="text-red-500 text-sm text-center">{saveError}</div>}
        </div>
        <DialogFooter className="flex justify-end gap-2 mt-4 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveLoading}
              className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-3 font-normal"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSaveResults}
              disabled={saveLoading || !date || players.length === 0 || Object.values(editResults).every(v => !v || v.trim() === '')}
              className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
            >
              {saveLoading ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnterResultsModal; 