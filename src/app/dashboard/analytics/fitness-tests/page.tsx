"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FITNESS_TEST_TYPES, FITNESS_TEST_UNITS } from "@/lib/constants";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import CreateFitnessTestModal from '@/components/fitness-tests/CreateFitnessTestModal';
import { Plus } from 'lucide-react';
import { TestDescriptionModal } from '@/components/fitness-tests/TestDescriptionModal';
import EnterResultsModal from '@/components/fitness-tests/EnterResultsModal';
import { TeamSelect } from '@/components/ui/team-select';
import EditFitnessTestModal from '@/components/fitness-tests/EditFitnessTestModal';
import DeleteFitnessTestModal from '@/components/fitness-tests/DeleteFitnessTestModal';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/date-utils';
// @ts-ignore
// eslint-disable-next-line
declare module 'react-sparklines';

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

interface FitnessTest {
  id: string;
  name: string;
  type: string;
  unit: string;
  createdAt: string;
  createdBy: string;
  description?: string;
}

interface PlayerResultsHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Player;
  results: FitnessTestResult[];
}
function PlayerResultsHistoryModal({ open, onOpenChange, player, results }: PlayerResultsHistoryModalProps) {
  const { t } = useTranslation();
  // Преобразуем данные для графика
  const chartData = results
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(r => ({
      date: formatDate(r.date),
      value: Number(r.value),
    }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-vista-dark text-vista-light rounded-xl p-6 shadow-xl max-w-2xl w-full border-none">
        <DialogHeader>
          <DialogTitle>{t('fitnessTest.page.history_modal_title', { player: `${player.lastName} ${player.firstName}` })}</DialogTitle>
        </DialogHeader>
        <div className="mb-6 w-full flex justify-center">
          <ResponsiveContainer width={600} height={220}>
            <AreaChart data={chartData} margin={{ left: 24, right: 24, top: 16, bottom: 8 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00bcd4" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#00bcd4" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#7dd3fc', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7dd3fc', fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <Tooltip contentStyle={{ background: '#222b3a', border: 'none', color: '#fff' }} labelStyle={{ color: '#7dd3fc' }} />
              <Area type="monotone" dataKey="value" stroke="#00bcd4" fillOpacity={1} fill="url(#colorValue)" dot={{ r: 5, stroke: '#00bcd4', strokeWidth: 2, fill: '#222b3a' }} activeDot={{ r: 7 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          {results.sort((a: FitnessTestResult, b: FitnessTestResult) => (b.date > a.date ? 1 : -1)).map((r: FitnessTestResult) => (
            <div key={r.id} className="flex justify-between text-sm border-b border-vista-secondary/20 py-1">
              <span>{formatDate(r.date)}</span>
              <span className="font-semibold">{formatResult(r.value)}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatResult(value: string) {
  if (!value) return '—';
  if (value.includes('.')) return value.replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1');
  return value;
}



export default function FitnessTestsPage() {
  const { t } = useTranslation();
  const [activeType, setActiveType] = useState(FITNESS_TEST_TYPES[0].value);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tests, setTests] = useState<FitnessTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newTestName, setNewTestName] = useState("");
  const [newTestType, setNewTestType] = useState(FITNESS_TEST_TYPES[0].value);
  const [newTestUnit, setNewTestUnit] = useState(FITNESS_TEST_UNITS[0].value);
  const [newTestDescription, setNewTestDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const unitListRef = useRef<HTMLDivElement>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);
  const [descModalOpen, setDescModalOpen] = useState(false);
  const [descModalText, setDescModalText] = useState("");
  const [descModalLoading, setDescModalLoading] = useState(false);
  const [isEnterResultsOpen, setIsEnterResultsOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<FitnessTest | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [results, setResults] = useState<FitnessTestResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyPlayer, setHistoryPlayer] = useState<Player | null>(null);
  const [historyResults, setHistoryResults] = useState<FitnessTestResult[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'result'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchTeams();
    fetchTests();
  }, []);

  async function fetchTests() {
    setLoading(true);
    try {
      const res = await fetch("/api/fitness-tests");
      const data = await res.json();
      setTests(Array.isArray(data) ? data : []);
    } catch {
      setTests([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTeams() {
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setTeams([]);
        setTeamError('Нет доступных команд');
        setSelectedTeamId('');
      } else {
        setTeams(data);
        setTeamError(null);
        // Если команд одна — выбираем её автоматически
        if (data.length === 1) setSelectedTeamId(data[0].id);
      }
    } catch {
      setTeams([]);
      setTeamError('Ошибка загрузки команд');
      setSelectedTeamId('');
    }
  }

  useEffect(() => {
    if (selectedTeamId) fetchPlayers(selectedTeamId);
    else setPlayers([]);
  }, [selectedTeamId]);

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

  // Загружаем результаты для выбранного теста и команды
  useEffect(() => {
    if (selectedTeamId && activeTestId) {
      fetchResults(activeTestId, selectedTeamId);
    } else {
      setResults([]);
    }
  }, [selectedTeamId, activeTestId]);

  async function fetchResults(testId: string, teamId: string) {
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

  async function handleCreateTest() {
    setCreateLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fitness-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTestName,
          type: newTestType,
          unit: newTestUnit,
          description: newTestDescription,
        }),
      });
      if (!res.ok) {
        setError("Ошибка при создании теста");
        setCreateLoading(false);
        return;
      }
      setIsCreateModalOpen(false);
      setNewTestName("");
      setNewTestType(FITNESS_TEST_TYPES[0].value);
      setNewTestUnit(FITNESS_TEST_UNITS[0].value);
      setNewTestDescription("");
      await fetchTests();
    } catch {
      setError("Ошибка при создании теста");
    } finally {
      setCreateLoading(false);
    }
  }

  function handleUnitScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    setShowTopFade(el.scrollTop > 0);
    setShowBottomFade(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  }

  // Получаем только те типы, для которых есть тесты
  const typesWithTests = FITNESS_TEST_TYPES.filter(type => tests.some(t => t.type === type.value));
  // Тесты текущего типа
  const testsOfType = tests.filter(t => t.type === activeType);
  // Активный тест
  const activeTest = testsOfType.find(t => t.id === activeTestId) || testsOfType[0] || null;

  // При смене типа сбрасываем выбранный тест
  useEffect(() => {
    if (testsOfType.length > 0) {
      setActiveTestId(testsOfType[0].id);
    } else {
      setActiveTestId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, tests.length]);

  // --- Action handlers for test buttons ---
  function handleEnterResults(test: FitnessTest) {
    setSelectedTest(test);
    setIsEnterResultsOpen(true);
  }
  function handleEditTest(test: FitnessTest) {
    alert(`Редактировать тест: ${test.name}`);
  }
  function handleDeleteTest(test: FitnessTest) {
    alert(`Удалить тест: ${test.name}`);
  }

  async function handleSaveDescription(testId: string, newDesc: string) {
    setDescModalLoading(true);
    try {
      const res = await fetch(`/api/fitness-tests/${testId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newDesc }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTests(tests => tests.map(t => t.id === testId ? { ...t, description: updated.description } : t));
        setDescModalText(updated.description || '');
      }
    } finally {
      setDescModalLoading(false);
    }
  }

  // Функция сортировки игроков
  function getSortedPlayers() {
    let sorted = [...players];
    if (sortBy === 'name') {
      sorted.sort((a, b) => {
        const cmp = a.lastName.localeCompare(b.lastName, 'ru');
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    } else if (sortBy === 'result') {
      sorted.sort((a, b) => {
        const aResult = results.filter(r => r.playerId === a.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.value || '';
        const bResult = results.filter(r => r.playerId === b.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.value || '';
        const cmp = Number(aResult) - Number(bResult);
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }
    return sorted;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4 w-full">
            <CardTitle className="text-vista-light">{t('fitnessTest.page.title')}</CardTitle>
            <div className="w-48 ml-4">
              <TeamSelect
                teams={teams}
                value={selectedTeamId}
                onChange={setSelectedTeamId}
                placeholder={t('fitnessTest.page.select_team_placeholder')}
                disabled={teams.length === 0}
              />
            </div>
          </div>
          <Button
            className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark whitespace-nowrap"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('fitnessTest.page.create_test_btn')}
          </Button>
        </CardHeader>
        <CardContent>
          {teamError ? (
            <div className="text-red-500 text-center py-8">{t('fitnessTest.page.team_error', { error: teamError })}</div>
          ) : !selectedTeamId ? (
            <div className="text-vista-light/70 text-center py-8">{t('fitnessTest.page.select_team_hint')}</div>
          ) : (
            <>
              <Tabs value={activeType} onValueChange={setActiveType} className="w-full">
                <TabsList className="bg-vista-dark/30 border border-vista-secondary/50">
                  {typesWithTests.map((type) => (
                    <TabsTrigger
                      key={type.value}
                      value={type.value}
                      className={
                        activeType === type.value
                          ? "data-[state=active]:bg-vista-primary data-[state=active]:text-vista-dark"
                          : "text-vista-light/70 hover:text-vista-light"
                      }
                    >
                      {t(`fitnessTest.type.${type.value}`)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              {/* Горизонтальный список тестов внутри типа */}
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2 custom-scrollbar">
                {testsOfType.length === 0 ? (
                  <div className="text-vista-light/70 text-center py-8 w-full">{t('fitnessTest.page.no_tests_of_type')}</div>
                ) : (
                  testsOfType.map(test => (
                    <Button
                      key={test.id}
                      size="sm"
                      variant={activeTestId === test.id ? 'default' : 'outline'}
                      className={activeTestId === test.id ? 'bg-vista-primary text-vista-dark' : 'border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20'}
                      onClick={() => setActiveTestId(test.id)}
                    >
                      {test.name}
                    </Button>
                  ))
                )}
              </div>
              {/* Кнопки и таблица результатов для выбранного теста */}
              {activeTest && (
                <>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark" onClick={() => handleEnterResults(activeTest)}>
                      {t('fitnessTest.page.enter_results_btn')}
                    </Button>
                    <Button size="sm" variant="outline" className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20" onClick={() => { setDescModalText(activeTest.description || ''); setDescModalOpen(true); }}>
                      {t('fitnessTest.page.test_description_btn')}
                    </Button>
                    <Button size="sm" variant="outline" className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 ml-auto" onClick={() => { setSelectedTest(activeTest); setIsEditModalOpen(true); }}>{t('fitnessTest.page.edit_test_btn')}</Button>
                    <Button size="sm" variant="outline" className="border-vista-error/50 text-vista-error hover:bg-vista-error/10" onClick={() => { setSelectedTest(activeTest); setIsDeleteModalOpen(true); }}>{t('fitnessTest.page.delete_test_btn')}</Button>
                  </div>
                  {/* Таблица результатов */}
                  {playersLoading || resultsLoading ? (
                    <div className="text-vista-light/70 text-center py-8">{t('fitnessTest.page.loading_results')}</div>
                  ) : players.length === 0 ? (
                    <div className="text-vista-light/70 text-center py-8">{t('fitnessTest.page.no_players')}</div>
                  ) : (
                    <div className="mt-6 overflow-x-auto rounded-2xl bg-vista-dark/80 border border-vista-secondary/30 custom-scrollbar">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-vista-secondary/40 h-14">
                            <th className="text-left cursor-pointer select-none py-3 pl-6" onClick={() => {
                              setSortBy('name');
                              setSortOrder(sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc');
                            }}>
                              {t('fitnessTest.page.table_name_col')} {sortBy === 'name' ? (
                                <span style={{ fontSize: '0.8em', color: '#00bcd4', marginLeft: 2 }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                              ) : ''}
                            </th>
                            <th className="text-center cursor-pointer select-none py-3" onClick={() => {
                              setSortBy('result');
                              setSortOrder(sortBy === 'result' && sortOrder === 'asc' ? 'desc' : 'asc');
                            }}>
                              {t('fitnessTest.page.table_result_col')} {sortBy === 'result' ? (
                                <span style={{ fontSize: '0.8em', color: '#00bcd4', marginLeft: 2 }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                              ) : ''}
                            </th>
                            <th className="text-center py-3">{t('fitnessTest.page.table_dynamic_col')}</th>
                            <th className="text-center py-3">{t('fitnessTest.page.table_history_col')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getSortedPlayers().map((player, idx, arr) => {
                            // Сортируем результаты по возрастанию даты (от старых к новым)
                            const playerResults = results.filter(r => r.playerId === player.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                            const lastResult = playerResults[playerResults.length - 1];
                            const isLast = idx === arr.length - 1;
                            return (
                              <tr key={player.id} className={(idx === 0 ? 'first:pt-4 ' : '') + (idx !== arr.length - 1 ? 'border-b border-vista-secondary/20' : '') + ' min-h-14'}>
                                <td className={"text-left text-vista-light/90 pl-6 py-3" + (idx === 0 ? ' pt-4' : '') + (isLast ? ' pb-4' : '')}>{player.lastName} {player.firstName}</td>
                                <td className={"text-center py-3" + (idx === 0 ? ' pt-4' : '') + (isLast ? ' pb-4' : '')}>
                                  {lastResult ? (
                                    <>
                                      <div className="text-vista-light/90 text-base font-semibold">{formatResult(lastResult.value)}</div>
                                      <div className="text-xs text-vista-light/40 mt-1">{formatDate(lastResult.date)}</div>
                                    </>
                                  ) : (
                                    <span className="text-vista-light/40">—</span>
                                  )}
                                </td>
                                <td className={"text-center py-3" + (idx === 0 ? ' pt-4' : '') + (isLast ? ' pb-4' : '')}>
                                  {playerResults.length > 1 && (
                                    <div className="inline-block w-96 align-middle relative">
                                      {/* SVG-диаграмма с area-заливкой, большими точками и отступами */}
                                      <svg width={320} height={32} style={{ display: 'block' }}>
                                        {/* Area-заливка */}
                                        <defs>
                                          <linearGradient id={`miniArea${player.id}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#00bcd4" stopOpacity={0.5}/>
                                            <stop offset="40%" stopColor="#00bcd4" stopOpacity={0.18}/>
                                            <stop offset="65%" stopColor="#00bcd4" stopOpacity={0.10}/>
                                            <stop offset="80%" stopColor="#00bcd4" stopOpacity={0.05}/>
                                            <stop offset="90%" stopColor="#00bcd4" stopOpacity={0.02}/>
                                            <stop offset="100%" stopColor="#00bcd4" stopOpacity={0}/>
                                          </linearGradient>
                                        </defs>
                                        {playerResults.length > 1 && (
                                          <polygon
                                            points={playerResults.map((r, i, arr) => {
                                              const x = 8 + (i / (arr.length - 1)) * (320 - 16);
                                              const y = 24 - (Number(r.value) / Math.max(...arr.map(rr => Number(rr.value))) * 20);
                                              return `${x},${y}`;
                                            }).join(' ') + ` ${8 + (320 - 16)},28 8,28`}
                                            fill={`url(#miniArea${player.id})`}
                                          />
                                        )}
                                        {/* Линия */}
                                        {playerResults.map((r, i, arr) => {
                                          if (i === 0) return null;
                                          const prev = arr[i - 1];
                                          const x1 = 8 + ((i - 1) / (arr.length - 1)) * (320 - 16);
                                          const x2 = 8 + (i / (arr.length - 1)) * (320 - 16);
                                          const y1 = 24 - (Number(prev.value) / Math.max(...arr.map(rr => Number(rr.value))) * 20);
                                          const y2 = 24 - (Number(r.value) / Math.max(...arr.map(rr => Number(rr.value))) * 20);
                                          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00bcd4" strokeWidth={2} />;
                                        })}
                                        {/* Кружки */}
                                        {playerResults.map((r, i, arr) => {
                                          const x = 8 + (i / (arr.length - 1)) * (320 - 16);
                                          const y = 24 - (Number(r.value) / Math.max(...arr.map(rr => Number(rr.value))) * 20);
                                          return (
                                            <circle key={i} cx={x} cy={y} r={5} fill="#00bcd4" stroke="#222b3a" strokeWidth={2}>
                                              <title>{formatResult(r.value)} ({formatDate(r.date)})</title>
                                            </circle>
                                          );
                                        })}
                                      </svg>
                                    </div>
                                  )}
                                </td>
                                <td className={"text-center py-3" + (idx === 0 ? ' pt-4' : '') + (isLast ? ' pb-4' : '')}>
                                  {playerResults.length > 0 && (
                                    <button
                                      className="bg-vista-primary/10 text-vista-primary rounded px-2 py-1 cursor-pointer text-xs transition hover:bg-vista-primary/20 hover:text-vista-primary/80"
                                      onClick={() => {
                                        setHistoryPlayer(player);
                                        setHistoryResults(playerResults);
                                        setHistoryModalOpen(true);
                                      }}
                                    >
                                      {t('fitnessTest.page.history_btn')}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
      {/* Модальное окно создания теста */}
      <CreateFitnessTestModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        newTestName={newTestName}
        setNewTestName={setNewTestName}
        newTestType={newTestType}
        setNewTestType={setNewTestType}
        newTestUnit={newTestUnit}
        setNewTestUnit={setNewTestUnit}
        newTestDescription={newTestDescription}
        setNewTestDescription={setNewTestDescription}
        error={error}
        loading={createLoading}
        onSave={handleCreateTest}
        onCancel={() => setIsCreateModalOpen(false)}
        FITNESS_TEST_TYPES={FITNESS_TEST_TYPES as any}
        FITNESS_TEST_UNITS={FITNESS_TEST_UNITS as any}
        unitListRef={unitListRef}
        handleUnitScroll={handleUnitScroll}
      />
      <TestDescriptionModal
        open={descModalOpen}
        onOpenChange={setDescModalOpen}
        description={descModalText}
      />
      {selectedTest && (
        <EnterResultsModal
          open={isEnterResultsOpen}
          onOpenChange={setIsEnterResultsOpen}
          testId={selectedTest.id}
          testName={selectedTest.name}
          testUnit={selectedTest.unit}
          teamId={selectedTeamId}
          onSaved={() => fetchResults(selectedTest.id, selectedTeamId)}
        />
      )}
      <EditFitnessTestModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        test={selectedTest}
        onSuccess={fetchTests}
      />
      <DeleteFitnessTestModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        test={selectedTest}
        onSuccess={fetchTests}
      />
      {historyPlayer && (
        <PlayerResultsHistoryModal
          open={historyModalOpen}
          onOpenChange={setHistoryModalOpen}
          player={historyPlayer}
          results={historyResults}
        />
      )}
    </div>
  );
} 