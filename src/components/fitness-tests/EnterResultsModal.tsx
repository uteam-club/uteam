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
      <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md w-full overflow-hidden backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-center mb-2 text-vista-light">
            {t('fitnessTest.enter_results_modal_title', { testName })}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <span className="block text-xs text-vista-light/60 mb-1">
              {t('fitnessTest.test_date_label')}
            </span>
            <div className="relative">
              <input
                type="date"
                className="form-input bg-vista-dark border-vista-secondary/50 text-vista-light focus:outline-none focus:ring-0 w-full"
                value={date}
                onChange={e => setDate(e.target.value)}
                disabled={saveLoading}
                required
              />
              {dateLoading && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-vista-primary"></div>
                </div>
              )}
            </div>
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
              <div className="overflow-y-auto max-h-[50vh] flex flex-col gap-2 custom-scrollbar">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center gap-2">
                    <div className="w-32 truncate text-vista-light/80">{player.lastName} {player.firstName}</div>
                    <input
                      type="number"
                      className="form-input flex-1"
                      value={editResults[player.id] ?? ''}
                      onChange={e => handleResultChange(player.id, e.target.value)}
                      placeholder={t('fitnessTest.result_placeholder', { unit: testUnit ? (FITNESS_TEST_UNITS.find(u => u.value === testUnit)?.label[lang] || testUnit) : '' })}
                      onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
          {saveError && <div className="text-red-500 text-sm text-center">{saveError}</div>}
        </div>
        <DialogFooter className="flex gap-2 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-1/2 border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0">
            {t('common.cancel')}
          </Button>
          <Button
            className="w-1/2 bg-vista-primary hover:bg-vista-primary/90 text-vista-dark focus:outline-none focus:ring-0"
            onClick={handleSaveResults}
            disabled={saveLoading || !date || players.length === 0 || Object.values(editResults).every(v => !v || v.trim() === '')}
          >
            {saveLoading ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnterResultsModal; 