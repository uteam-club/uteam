"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
import { Plus, Ruler, HeartPulse, Zap, Dumbbell, StretchHorizontal, Shuffle, Trophy, ChevronUp, ChevronDown } from 'lucide-react';
import { TestDescriptionModal } from '@/components/fitness-tests/TestDescriptionModal';
import EnterResultsModal from '@/components/fitness-tests/EnterResultsModal';
import { TeamSelect } from '@/components/ui/team-select';
import EditFitnessTestModal from '@/components/fitness-tests/EditFitnessTestModal';
import DeleteFitnessTestModal from '@/components/fitness-tests/DeleteFitnessTestModal';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart, BarChart, Bar, LabelList, ReferenceLine, Cell } from 'recharts';
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
  higherIsBetter?: boolean;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [editingDate, setEditingDate] = useState<string>('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Преобразуем данные для графика
  const chartData = results
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(r => ({
      date: formatDate(r.date),
      value: Number(r.value),
    }));

  async function handleDelete(id: string) {
    try {
      setBusyId(id);
      const res = await fetch(`/api/fitness-tests/results?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      const idx = results.findIndex(r => r.id === id);
      if (idx >= 0) results.splice(idx, 1);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSave(id: string) {
    try {
      setBusyId(id);
      const payload: any = { id };
      if (editingValue !== '') payload.value = editingValue;
      if (editingDate) payload.date = editingDate;
      const res = await fetch('/api/fitness-tests/results', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      const idx = results.findIndex(r => r.id === id);
      if (idx >= 0) {
        results[idx].value = updated.value;
        results[idx].date = updated.date;
      }
      setEditingId(null);
      setEditingValue('');
      setEditingDate('');
    } finally {
      setBusyId(null);
    }
  }

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
            <div key={r.id} className="flex items-center justify-between gap-3 text-sm border-b border-vista-secondary/20 py-1">
              {editingId === r.id ? (
                <input
                  type="date"
                  className="shrink-0 w-40 bg-vista-dark/40 border border-vista-secondary/30 rounded px-2 py-1"
                  value={editingDate}
                  onChange={(e) => setEditingDate(e.target.value)}
                />
              ) : (
                <span className="shrink-0 w-40">{formatDate(r.date)}</span>
              )}
              {editingId === r.id ? (
                <input
                  className="flex-1 bg-vista-dark/40 border border-vista-secondary/30 rounded px-2 py-1"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                />
              ) : (
                <span className="font-semibold flex-1">{formatResult(r.value)}</span>
              )}
              <div className="flex items-center gap-2">
                {editingId === r.id ? (
                  <>
                    <button disabled={busyId === r.id} onClick={() => handleSave(r.id)} className="px-2 py-1 text-xs bg-vista-primary/20 text-vista-primary rounded">{t('common.save')}</button>
                    <button onClick={() => { setEditingId(null); setEditingValue(''); setEditingDate(''); }} className="px-2 py-1 text-xs bg-vista-secondary/20 rounded">{t('common.cancel')}</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditingId(r.id); setEditingValue(String(r.value)); setEditingDate(r.date.slice(0, 10)); }} className="px-2 py-1 text-xs bg-vista-secondary/20 rounded">{t('common.edit')}</button>
                    <button disabled={busyId === r.id} onClick={() => handleDelete(r.id)} className="px-2 py-1 text-xs bg-vista-error/20 text-vista-error rounded">{t('common.delete')}</button>
                  </>
                )}
              </div>
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

function formatShortDate(date: string) {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit',
      year: '2-digit'
    });
  } catch {
    return '';
  }
}

function getTestTypeIcon(type: string) {
  const iconProps = { className: "w-4 h-4" };
  
  switch (type) {
    case 'anthropometry':
      return <Ruler {...iconProps} />;
    case 'endurance':
      return <HeartPulse {...iconProps} />;
    case 'speed':
      return <Zap {...iconProps} />;
    case 'strength':
      return <Dumbbell {...iconProps} />;
    case 'flexibility':
      return <StretchHorizontal {...iconProps} />;
    case 'agility':
      return <Shuffle {...iconProps} />;
    default:
      return null;
  }
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
  const [newTestHigherIsBetter, setNewTestHigherIsBetter] = useState<boolean>(true);
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
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'result' | 'previous' | 'change' | 'best' | 'percentile' | 'category'>('percentile');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  // Настройки для графиков под таблицей
  const [teamMetric, setTeamMetric] = useState<'mean' | 'median'>('mean');
  const [posMetric, setPosMetric] = useState<'mean' | 'median'>('median');
  const [distPlayerId, setDistPlayerId] = useState<string>('');

  // Показываем все типы тестов и вычисляем активный тест (переносим выше использования)
  // ВАЖНО: этот блок уже объявлен выше — убедимся, что он объявлен только один раз

  // --- Helpers for analytics table ---
  function dateKey(d: string) {
    // Use YYYY-MM-DD part for session grouping
    return d.slice(0, 10);
  }

  const currentSessionKey = useMemo(() => {
    if (!results || results.length === 0) return '';
    const keys = results.map(r => dateKey(r.date));
    return keys.sort().at(-1) || '';
  }, [results]);

  const currentSessionValues = useMemo(() => {
    if (!currentSessionKey) return [] as { playerId: string; value: number }[];
    return results
      .filter(r => dateKey(r.date) === currentSessionKey)
      .map(r => ({ playerId: r.playerId, value: Number(r.value) }))
      .filter(v => !Number.isNaN(v.value));
  }, [results, currentSessionKey]);

  // --- Данные для графиков под таблицей ---
  // Игрок по умолчанию для распределения (берем тех, у кого есть значение в текущей сессии)
  useEffect(() => {
    if (!distPlayerId) {
      const sessionIds = new Set(currentSessionValues.map(v => v.playerId));
      const first = players.find(p => sessionIds.has(p.id)) || players[0];
      if (first) setDistPlayerId(first.id);
    } else {
      if (players.length > 0 && !players.some(p => p.id === distPlayerId)) {
        setDistPlayerId(players[0].id);
      }
    }
  }, [players, currentSessionValues]);

  // Распределение команды (boxplot) по текущей сессии
  const distData = useMemo(() => {
    const values = currentSessionValues.map(v => v.value).filter(v => !Number.isNaN(v));
    if (values.length === 0) return null as null | any;
    const sorted = [...values].sort((a, b) => a - b);
    const quantile = (arr: number[], p: number) => {
      if (arr.length === 0) return null;
      const idx = (arr.length - 1) * p;
      const lo = Math.floor(idx);
      const hi = Math.ceil(idx);
      if (lo === hi) return arr[lo];
      return arr[lo] + (arr[hi] - arr[lo]) * (idx - lo);
    };
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const q1 = quantile(sorted, 0.25)!;
    const med = quantile(sorted, 0.5)!;
    const q3 = quantile(sorted, 0.75)!;
    const range = Math.max(1e-9, max - min);
    const pos = (x: number) => ((x - min) / range) * 100;
    const playerVal = currentSessionValues.find(v => v.playerId === distPlayerId)?.value ?? null;
    const hib = (tests.find(t => t.id === activeTestId)?.higherIsBetter) ?? true;
    const { percentileByPlayer: pctMap } = computePercentilesHazen(currentSessionValues, hib);
    const playerPct = playerVal !== null ? (pctMap.get(distPlayerId) ?? null) : null;
    return {
      min, max, q1, med, q3, playerVal, playerPct,
      positions: {
        min: 0,
        q1: pos(q1),
        med: pos(med),
        q3: pos(q3),
        max: 100,
        player: playerVal !== null ? pos(playerVal) : null
      }
    };
  }, [currentSessionValues, distPlayerId, activeTestId, tests]);

  // Командный тренд по всем датам
  const teamTrendData = useMemo(() => {
    if (!results || results.length === 0) return [] as { date: string; mean: number; median: number; sd: number; lower: number; range: number }[];
    const byDate: Record<string, number[]> = {};
    for (const r of results) {
      const k = dateKey(r.date);
      const v = Number(r.value);
      if (Number.isNaN(v)) continue;
      if (!byDate[k]) byDate[k] = [];
      byDate[k].push(v);
    }
    const calcMedian = (arr: number[]) => {
      const s = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    };
    return Object.keys(byDate).sort().map(d => {
      const vals = byDate[d];
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const median = calcMedian(vals);
      const sdv = stddev(vals);
      const lower = mean - sdv;
      const upper = mean + sdv;
      return { date: d, mean, median, sd: sdv, lower, range: Math.max(0, upper - lower) };
    });
  }, [results]);

  

  function computePercentilesHazen(values: { playerId: string; value: number }[], higherIsBetter: boolean) {
    // Convert to score (monotonic increasing = better)
    const scored = values.map(v => ({ playerId: v.playerId, score: higherIsBetter ? v.value : -v.value }));
    // Sort by score asc
    const sorted = [...scored].sort((a, b) => a.score - b.score);
    const N = sorted.length;
    if (N === 0) return { N, percentileByPlayer: new Map<string, number>(), rankByPlayer: new Map<string, number>() };

    // Compute average ranks for ties
    const rankByIndex = new Array<number>(N);
    let i = 0;
    while (i < N) {
      let j = i + 1;
      while (j < N && sorted[j].score === sorted[i].score) j++;
      // tie group [i, j)
      const avgRank = (i + 1 + j) / 2; // average of 1-based ranks
      for (let k = i; k < j; k++) rankByIndex[k] = avgRank;
      i = j;
    }

    const percentileByPlayer = new Map<string, number>();
    const rankByPlayer = new Map<string, number>();
    for (let idx = 0; idx < N; idx++) {
      const r = rankByIndex[idx];
      const p = ((r - 0.5) / N) * 100;
      percentileByPlayer.set(sorted[idx].playerId, p);
      rankByPlayer.set(sorted[idx].playerId, r);
    }
    return { N, percentileByPlayer, rankByPlayer };
  }

  function stddev(values: number[]) {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  // Показываем все типы тестов и вычисляем активный тест РАНО, до использования ниже
  const typesWithTests = FITNESS_TEST_TYPES;
  const testsOfType = useMemo(() => tests.filter(t => t.type === activeType), [tests, activeType]);
  const activeTest = useMemo(() => {
    const list = testsOfType;
    return list.find(t => t.id === activeTestId) || list[0] || null;
  }, [testsOfType, activeTestId]);

  // Рассчитываем перцентили для всех игроков с результатами, а не только для текущей сессии
  const { N: sessionN, percentileByPlayer, rankByPlayer } = useMemo(() => {
    if (!results || results.length === 0) return { N: 0, percentileByPlayer: new Map(), rankByPlayer: new Map() };
    const hib = activeTest?.higherIsBetter ?? true;
    
    // Берем все результаты для расчета перцентилей
    const allValues = results
      .map(r => ({ playerId: r.playerId, value: Number(r.value) }))
      .filter(v => !Number.isNaN(v.value));
    
    return computePercentilesHazen(allValues, hib);
  }, [results, activeTest?.higherIsBetter]);

  type Row = {
    player: Player;
    currentDateKey: string | null;
    currentValue: number | null;
    previousValue: number | null;
    deltaAbs: number | null;
    deltaPct: number | null; // null if prev=0 or missing
    normalizedDelta: number | null; // direction * (current-previous)
    bestValue: number | null;
    percentile: number | null;
    rank: number | null;
    hasFewSamples: boolean; // N < 5
    playerResultsSorted: FitnessTestResult[];
  };

  const rows = useMemo<Row[]>(() => {
    if (!players || players.length === 0) return [];
    const hib = activeTest?.higherIsBetter ?? true;

    // Index results by player sorted by date asc
    const byPlayer: Record<string, FitnessTestResult[]> = {};
    for (const r of results) {
      if (!byPlayer[r.playerId]) byPlayer[r.playerId] = [];
      byPlayer[r.playerId].push(r);
    }
    Object.values(byPlayer).forEach(arr => arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));

    // Team SD for current session (fallback for SWC)
    const sessionVals = currentSessionValues.map(v => v.value);
    const teamSessionSd = stddev(sessionVals);

    const out: Row[] = players.map(player => {
      const arr = byPlayer[player.id] || [];
      const arrAsc = arr; // already sorted asc

      // Take player's own last measurement as current
      const currentIdx = arrAsc.length - 1;
      const current = currentIdx >= 0 ? Number(arrAsc[currentIdx].value) : null;
      const currentDate = currentIdx >= 0 ? dateKey(arrAsc[currentIdx].date) : null;
      const prev = currentIdx > 0 ? Number(arrAsc[currentIdx - 1].value) : null;

      const isInCurrentSession = currentDate !== null && currentDate === currentSessionKey;

      // All-time best respecting direction
      const valuesAll = arrAsc.map(x => Number(x.value)).filter(v => !Number.isNaN(v));
      let best: number | null = null;
      if (valuesAll.length > 0) {
        best = hib ? Math.max(...valuesAll) : Math.min(...valuesAll);
      }

      let deltaAbs: number | null = null;
      let deltaPct: number | null = null;
      let normalizedDelta: number | null = null;
      if (current !== null && prev !== null) {
        deltaAbs = current - prev;
        if (prev !== 0) {
          deltaPct = ((current - prev) / Math.abs(prev)) * 100;
        } else {
          deltaPct = null;
        }
        const direction = hib ? 1 : -1;
        normalizedDelta = direction * (current - prev);
      }

      // Percentile and rank are calculated for all players with results
      const percentile = current !== null ? (percentileByPlayer.get(player.id) ?? null) : null;
      const rank = current !== null ? (rankByPlayer.get(player.id) ?? null) : null;

      return {
        player,
        currentDateKey: currentDate,
        currentValue: current,
        previousValue: prev,
        deltaAbs,
        deltaPct,
        normalizedDelta,
        bestValue: best,
        percentile,
        rank,
        hasFewSamples: (sessionN || 0) < 5,
        playerResultsSorted: arrAsc,
      };
    });

    // Sort based on selected field
    out.sort((a, b) => {
      let valueA: any = null;
      let valueB: any = null;

      switch (sortBy) {
        case 'name':
          valueA = `${a.player.lastName} ${a.player.firstName}`;
          valueB = `${b.player.lastName} ${b.player.firstName}`;
          break;
        case 'date':
          valueA = a.currentDateKey || '';
          valueB = b.currentDateKey || '';
          break;
        case 'result':
          valueA = a.currentValue ?? -1;
          valueB = b.currentValue ?? -1;
          break;
        case 'previous':
          valueA = a.previousValue ?? -1;
          valueB = b.previousValue ?? -1;
          break;
        case 'change':
          valueA = a.normalizedDelta ?? -Infinity;
          valueB = b.normalizedDelta ?? -Infinity;
          break;
        case 'best':
          valueA = a.bestValue ?? -1;
          valueB = b.bestValue ?? -1;
          break;
        case 'percentile':
          valueA = a.percentile ?? -1;
          valueB = b.percentile ?? -1;
          break;
        case 'category':
          valueA = a.percentile ?? -1; // Use percentile for category sorting
          valueB = b.percentile ?? -1;
          break;
      }

      if (valueA === null && valueB === null) return 0;
      if (valueA === null) return 1;
      if (valueB === null) return -1;

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        const result = valueA.localeCompare(valueB, 'ru');
        return sortOrder === 'asc' ? result : -result;
      }

      const numA = Number(valueA);
      const numB = Number(valueB);
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });

    return out;
  }, [players, results, currentSessionKey, currentSessionValues, percentileByPlayer, rankByPlayer, sessionN, activeTest?.higherIsBetter, sortBy, sortOrder]);

  function formatDelta(deltaAbs: number | null, deltaPct: number | null) {
    if (deltaAbs === null) return '—';
    const absStr = formatResult(String(deltaAbs));
    const pctStr = deltaPct === null ? '—' : `${deltaPct.toFixed(1)}%`;
    const sign = deltaAbs > 0 ? '+' : '';
    return `${sign}${absStr} (${pctStr})`;
  }

  function getDeltaClass(playerId: string, normalizedDelta: number | null, prev: number | null) {
    if (normalizedDelta === null || prev === null) return 'text-vista-light/60';
    // SWC
    const playerAll = results.filter(r => r.playerId === playerId).map(r => Number(r.value)).filter(v => !Number.isNaN(v));
    let swc = 0.02 * Math.abs(prev); // default 2%
    const playerSd = stddev(playerAll);
    if (playerSd > 0) swc = Math.max(swc, 0.2 * playerSd);
    else if (sessionN >= 5) {
      const sessionVals = currentSessionValues.map(v => v.value);
      const teamSd = stddev(sessionVals);
      if (teamSd > 0) swc = Math.max(swc, 0.2 * teamSd);
    }
    if (normalizedDelta > swc) return 'text-emerald-400';
    if (normalizedDelta < -swc) return 'text-red-400';
    return 'text-vista-light/60';
  }

  // Функции для сортировки
  function handleSort(field: typeof sortBy) {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  }

  function getSortIcon(field: typeof sortBy) {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  }

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
          higherIsBetter: newTestHigherIsBetter,
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
      setNewTestHigherIsBetter(true);
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

  // (перенесено выше)

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
            <div className="ml-4">
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
            variant="outline"
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-[200px] bg-transparent border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-2 font-normal text-sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
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
              <div className="grid w-full grid-cols-6 gap-2">
                {typesWithTests.map((type) => (
                  <Button
                    key={type.value}
                    variant="outline"
                    className={`flex items-center gap-2 h-8 px-3 text-sm font-normal transition-none ${
                      activeType === type.value
                        ? 'bg-vista-primary/15 text-vista-primary border-vista-primary'
                        : 'bg-transparent text-vista-light/60 border-vista-light/20 hover:bg-vista-light/10 hover:text-vista-light hover:border-vista-light/40'
                    }`}
                    onClick={() => setActiveType(type.value)}
                  >
                    {getTestTypeIcon(type.value)}
                    {t(`fitnessTest.type.${type.value}`)}
                  </Button>
                ))}
              </div>
              {/* Горизонтальный список тестов внутри типа */}
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2 custom-scrollbar">
                {testsOfType.length === 0 ? (
                  <div className="text-vista-light/70 text-center py-8 w-full">{t('fitnessTest.page.no_tests_of_type')}</div>
                ) : (
                  testsOfType.map(test => (
                    <Button
                      key={test.id}
                      variant="outline"
                      className={`h-8 px-3 text-sm font-normal transition-none ${
                        activeTestId === test.id 
                          ? 'bg-vista-primary/15 text-vista-primary border-vista-primary hover:bg-vista-primary/20' 
                          : 'bg-transparent text-vista-light/70 border-vista-light/20 hover:bg-vista-light/10 hover:text-vista-light hover:border-vista-light/40'
                      }`}
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
                  {/* Основные действия */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-8 px-3 text-sm"
                        onClick={() => handleEnterResults(activeTest)}
                      >
                        {t('fitnessTest.page.enter_results_btn')}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="bg-transparent text-vista-light/60 border-vista-light/20 hover:bg-vista-light/10 hover:text-vista-light hover:border-vista-light/40 h-8 px-3 text-sm"
                        onClick={() => { setDescModalText(activeTest.description || ''); setDescModalOpen(true); }}
                      >
                        {t('fitnessTest.page.test_description_btn')}
                      </Button>
                    </div>
                    
                    {/* Действия управления тестом */}
                    <div className="flex gap-2 ml-auto">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="bg-transparent text-vista-light/60 border-vista-light/20 hover:bg-vista-light/10 hover:text-vista-light hover:border-vista-light/40 h-8 px-3 text-sm"
                        onClick={() => { setSelectedTest(activeTest); setIsEditModalOpen(true); }}
                      >
                        {t('fitnessTest.page.edit_test_btn')}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-8 px-3 text-sm"
                        onClick={() => { setSelectedTest(activeTest); setIsDeleteModalOpen(true); }}
                      >
                        {t('fitnessTest.page.delete_test_btn')}
                      </Button>
                    </div>
                  </div>
                  {/* Таблица результатов */}
              <div className="mt-6">
                  {playersLoading || resultsLoading ? (
                    <div className="text-vista-light/70 text-center py-8">{t('fitnessTest.page.loading_results')}</div>
                  ) : players.length === 0 ? (
                    <div className="text-vista-light/70 text-center py-8">{t('fitnessTest.page.no_players')}</div>
                  ) : (
                    <div className="p-6 bg-vista-dark/50 border-vista-secondary/50 rounded-md">
                      <div className="w-full overflow-x-auto">
                        <table className="w-full text-sm text-vista-light border border-vista-secondary/30 rounded-md table-fixed" style={{ tableLayout: 'fixed' }}>
                        <thead>
                          <tr className="bg-vista-dark/70 text-xs">
                            <th className="px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight" style={{ width: '180px' }}>
                              <button 
                                onClick={() => handleSort('name')}
                                className="flex items-center gap-1 hover:text-vista-primary transition-colors"
                              >
                                {t('fitnessTest.page.table_name_col')} {getSortIcon('name')}
                              </button>
                            </th>
                            <th className="px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight text-center" style={{ minWidth: '100px' }}>
                              <button 
                                onClick={() => handleSort('date')}
                                className="flex items-center justify-center gap-1 hover:text-vista-primary transition-colors w-full"
                              >
                                {t('fitnessTest.page.table_date_col')} {getSortIcon('date')}
                              </button>
                            </th>
                            <th className="px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight text-center" style={{ minWidth: '100px' }}>
                              <button 
                                onClick={() => handleSort('result')}
                                className="flex items-center justify-center gap-1 hover:text-vista-primary transition-colors w-full"
                              >
                                {t('fitnessTest.page.table_result_col')} {getSortIcon('result')}
                              </button>
                            </th>
                            <th className="px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight text-center" style={{ minWidth: '100px' }}>
                              <button 
                                onClick={() => handleSort('previous')}
                                className="flex items-center justify-center gap-1 hover:text-vista-primary transition-colors w-full"
                              >
                                {t('fitnessTest.page.table_prev_col')} {getSortIcon('previous')}
                              </button>
                            </th>
                            <th className="px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight text-center" style={{ minWidth: '100px' }}>
                              <button 
                                onClick={() => handleSort('change')}
                                className="flex items-center justify-center gap-1 hover:text-vista-primary transition-colors w-full"
                              >
                                {t('fitnessTest.page.table_change_col')} {getSortIcon('change')}
                              </button>
                            </th>
                            <th className="px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight text-center" style={{ minWidth: '100px' }}>
                              <button 
                                onClick={() => handleSort('best')}
                                className="flex items-center justify-center gap-1 hover:text-vista-primary transition-colors w-full"
                              >
                                {t('fitnessTest.page.table_best_col')} {getSortIcon('best')}
                              </button>
                            </th>
                            <th className="px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight text-center" style={{ minWidth: '100px' }}>
                              <button 
                                onClick={() => handleSort('percentile')}
                                className="flex items-center justify-center gap-1 hover:text-vista-primary transition-colors w-full"
                              >
                                {t('fitnessTest.page.table_percentile_col')} {getSortIcon('percentile')}
                              </button>
                            </th>
                            <th className="px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight text-center" style={{ minWidth: '100px' }}>
                              <button 
                                onClick={() => handleSort('category')}
                                className="flex items-center justify-center gap-1 hover:text-vista-primary transition-colors w-full"
                              >
                                {t('fitnessTest.page.table_category_col')} {getSortIcon('category')}
                              </button>
                            </th>
                            <th className="px-2 py-2 border-b border-vista-secondary/30 text-xs font-normal tracking-tight text-center" style={{ minWidth: '100px' }}>
                              {t('fitnessTest.page.table_history_col')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, idx, arr) => {
                            const isLast = idx === arr.length - 1;
                            const playerResults = row.playerResultsSorted;
                            const direction = activeTest?.higherIsBetter ?? true;
                            const elite = row.percentile !== null && row.percentile >= 90;
                            const cat = row.percentile === null ? '—' : row.percentile < 25 ? t('fitnessTest.page.category_below') : row.percentile >= 75 ? (row.percentile >= 90 ? t('fitnessTest.page.category_elite') : t('fitnessTest.page.category_above')) : t('fitnessTest.page.category_avg');
                            
                            // Цветовая градация для категорий
                            const getCategoryColor = (percentile: number | null) => {
                              if (percentile === null) return 'text-vista-light/50';
                              if (percentile < 25) return 'text-red-400'; // Ниже среднего - красный
                              if (percentile < 50) return 'text-orange-400'; // Ниже среднего (25-50) - оранжевый
                              if (percentile < 75) return 'text-yellow-400'; // Средний (50-75) - желтый
                              if (percentile < 90) return 'text-green-400'; // Выше среднего (75-90) - зеленый
                              return 'text-emerald-400'; // Элит (90+) - ярко-зеленый
                            };
                            const deltaClass = (row.currentValue !== null && row.previousValue !== null) ? getDeltaClass(row.player.id, row.normalizedDelta, row.previousValue) : 'text-vista-light/50';
                            const deltaIcon = (row.currentValue !== null && row.previousValue !== null && row.normalizedDelta !== null) ? (row.normalizedDelta > 0 ? '▲' : row.normalizedDelta < 0 ? '▼' : '→') : '';
                            return (
                              <tr key={row.player.id} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10 min-h-[44px]">
                                <td className="px-2 py-0.5 border-r border-vista-secondary/30 text-xs text-vista-light min-h-[44px]" style={{ width: '180px' }}>
                                  {row.player.lastName} {row.player.firstName}
                                </td>
                                <td className="px-2 py-0.5 border-r border-vista-secondary/30 align-middle min-h-[44px] text-center" style={{ minWidth: '100px' }}>
                                  {row.currentDateKey ? (
                                    <span className="text-vista-light/50 text-xs">{formatShortDate(row.currentDateKey)}</span>
                                  ) : <span className="text-vista-light/50 text-sm">-</span>}
                                </td>
                                <td className="px-2 py-0.5 border-r border-vista-secondary/30 align-middle min-h-[44px] text-center" style={{ minWidth: '100px' }}>
                                  {row.currentValue !== null ? (
                                    <span className="inline-flex items-center justify-center text-xs font-medium text-vista-light/80 min-w-[44px]">{formatResult(String(row.currentValue))}</span>
                                  ) : <span className="text-vista-light/50 text-sm">-</span>}
                                </td>
                                <td className="px-2 py-0.5 border-r border-vista-secondary/30 align-middle min-h-[44px] text-center" style={{ minWidth: '100px' }}>
                                  {row.previousValue !== null ? (
                                    <span className="inline-flex items-center justify-center text-xs font-medium text-vista-light/80 min-w-[44px]">{formatResult(String(row.previousValue))}</span>
                                  ) : <span className="text-vista-light/50 text-sm">-</span>}
                                </td>
                                <td className="px-2 py-0.5 border-r border-vista-secondary/30 align-middle min-h-[44px] text-center" style={{ minWidth: '100px' }}>
                                  {row.currentValue !== null && row.previousValue !== null ? (
                                    <div className={`${deltaClass} text-xs`}>
                                      <span className="mr-1">{deltaIcon}</span>
                                      {formatDelta(row.deltaAbs, row.deltaPct)}
                                    </div>
                                  ) : <span className="text-vista-light/50 text-sm">-</span>}
                                </td>
                                <td className="px-2 py-0.5 border-r border-vista-secondary/30 align-middle min-h-[44px] text-center" style={{ minWidth: '100px' }}>
                                  {row.bestValue !== null ? (
                                    <span className="inline-flex items-center justify-center text-xs font-medium text-vista-light/80 min-w-[44px]">{formatResult(String(row.bestValue))}</span>
                                  ) : <span className="text-vista-light/50 text-sm">-</span>}
                                </td>
                                <td className="px-2 py-0.5 border-r border-vista-secondary/30 align-middle min-h-[44px] text-center" style={{ minWidth: '100px' }}>
                                  {row.percentile !== null ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <div className="w-16 h-2 bg-vista-secondary/20 rounded overflow-hidden">
                                        <div className="h-full bg-vista-primary" style={{ width: `${Math.max(0, Math.min(100, row.percentile))}%` }} />
                                      </div>
                                      <div className="text-vista-light/90 text-xs min-w-[32px] text-right">{row.percentile.toFixed(0)}%</div>
                                    </div>
                                  ) : (
                                    row.hasFewSamples && row.rank !== null ? (
                                      <span className="text-vista-light/60 text-xs">{row.rank.toFixed(0)}/{sessionN} · n&lt;5</span>
                                    ) : <span className="text-vista-light/50 text-sm">-</span>
                                  )}
                                </td>
                                <td className="px-2 py-0.5 border-r border-vista-secondary/30 align-middle min-h-[44px] text-center" style={{ minWidth: '100px' }}>
                                  {row.percentile !== null ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <span className={`${getCategoryColor(row.percentile)} text-xs font-medium`}>{cat}</span>
                                      {elite && <Trophy className="w-3 h-3 text-emerald-400" />}
                                    </div>
                                  ) : <span className="text-vista-light/50 text-sm">-</span>}
                                </td>
                                <td className="px-2 py-0.5 align-middle text-center min-h-[44px]" style={{ minWidth: '100px' }}>
                                  {playerResults.length > 0 ? (
                                    <button
                                      className="px-3 py-1 rounded-md border border-vista-secondary/30 bg-vista-dark/30 text-vista-light/50 hover:text-vista-light/80 hover:bg-vista-primary/20 hover:border-vista-primary/40 transition-colors text-xs"
                                      onClick={() => {
                                        setHistoryPlayer(row.player);
                                        setHistoryResults(playerResults);
                                        setHistoryModalOpen(true);
                                      }}
                                    >
                                      {t('fitnessTest.page.history_btn')}
                                    </button>
                                  ) : <span className="text-vista-light/50 text-sm">-</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  )}
              </div>


              {/* Водопад изменений (Δ, значимость по SWC) */}
              <Card className="p-6 bg-vista-dark/50 border-vista-secondary/50 shadow-md mt-6">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base text-vista-light flex items-center justify-between gap-2">
                    <span>{t('fitnessTest.page.waterfall_title', 'Изменения по игрокам')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-80 w-full">
                    {(() => {
                      // Локально формируем waterfall из rows (после их вычисления)
                      const sessionVals = currentSessionValues.map(v => v.value);
                      const teamSd = stddev(sessionVals);
                      const rowsData = rows.map(r => ({ name: `${r.player.lastName} ${r.player.firstName}`, delta: r.normalizedDelta ?? 0, prev: r.previousValue }));
                      // SWC = 20% от стандартного отклонения команды (научно обоснованный порог)
                      // Fallback: 2% от среднего значения команды
                      const teamMean = sessionVals.length > 0 ? sessionVals.reduce((a, b) => a + b, 0) / sessionVals.length : 1;
                      const swc = teamSd > 0 ? 0.2 * teamSd : Math.max(0.02 * teamMean, 0.01);
                      const data = rowsData.sort((a,b)=> b.delta - a.delta).map(r => ({ name: r.name, value: r.delta, significant: Math.abs(r.delta) > swc }));
                      return data.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 40, right: 80, left: 60, bottom: 80 }}>
                          <defs>
                            <linearGradient id="deltaGradient" x1="0" y1="1" x2="0" y2="0">
                              <stop offset="0%" stopColor="#5acce5" stopOpacity={0.8}/>
                              <stop offset="70%" stopColor="#4ab8d1" stopOpacity={0.4}/>
                              <stop offset="100%" stopColor="#3a9bbd" stopOpacity={0.2}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                          <XAxis dataKey="name" tick={{ fill: '#7dd3fc', fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={80} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#7dd3fc', fontSize: 12 }} axisLine={false} tickLine={false} width={60} />
                          <Tooltip 
                            contentStyle={{ 
                              background: '#0f172a', 
                              border: '1px solid #334155', 
                              borderRadius: '8px',
                              color: '#e5e7eb',
                              fontSize: '12px',
                              fontFamily: 'inherit',
                              padding: '8px 12px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                            }} 
                            formatter={(v: number, name: string) => [
                              <span key="value" style={{ color: '#5acce5' }}>{formatResult(String(v))}</span>, 
                              <span key="label" style={{ color: '#e5e7eb' }}>{t('fitnessTest.page.delta', 'Δ')}</span>
                            ]} 
                            labelFormatter={(label: string) => <span style={{ color: '#e5e7eb' }}>{label}</span>}
                            cursor={{ fill: 'rgba(90, 204, 229, 0.1)' }}
                          />
                          <ReferenceLine y={0} stroke="#475569" />
                          <ReferenceLine y={swc} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'SWC+', fill: '#10b981', fontSize: 10, position: 'right' }} />
                          <ReferenceLine y={-swc} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'SWC-', fill: '#ef4444', fontSize: 10, position: 'right' }} />
                          <Bar 
                            dataKey="value" 
                            radius={[6, 6, 0, 0]}
                            fill="url(#deltaGradient)"
                            stroke="#5acce5"
                            strokeOpacity={0.6}
                            strokeWidth={1}
                            isAnimationActive={false}
                            activeBar={{ fill: "url(#deltaGradient)", stroke: "#5acce5", strokeOpacity: 0.6, strokeWidth: 1 }}
                          >
                            <LabelList 
                              dataKey="value" 
                              position="top" 
                              style={{ fill: '#7dd3fc', fontSize: 10, fontWeight: 500 }} 
                              formatter={(v: number) => formatResult(String(v))} 
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-vista-light/60 text-center text-sm py-6">{t('fitnessTest.page.no_data', 'Нет данных')}</div>
                    );})()}
                  </div>
                </CardContent>
              </Card>

              {/* Лестница перцентилей */}
              <Card className="p-6 bg-vista-dark/50 border-vista-secondary/50 shadow-md mt-6">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base text-vista-light flex items-center justify-between gap-2">
                    <span>{t('fitnessTest.page.percentile_ladder_title', 'Лестница перцентилей (топ‑20)')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-96 w-full">
                    {(() => {
                      const data = rows
                        .filter(r => r.percentile !== null)
                        .sort((a, b) => (b.percentile! - a.percentile!))
                        .slice(0, 20)
                        .map(r => ({ name: `${r.player.lastName} ${r.player.firstName}`, p: Math.round(r.percentile!) }));
                      return data.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ top: 20, right: 40, left: 60, bottom: 20 }}>
                          <defs>
                            <linearGradient id="percentileGradient" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#5acce5" stopOpacity={0.8}/>
                              <stop offset="70%" stopColor="#4ab8d1" stopOpacity={0.4}/>
                              <stop offset="100%" stopColor="#3a9bbd" stopOpacity={0.2}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                          <XAxis type="number" domain={[0, 100]} tick={{ fill: '#7dd3fc', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            tick={{ fill: '#7dd3fc', fontSize: 12 }} 
                            width={60} 
                            axisLine={false} 
                            tickLine={false}
                            tickMargin={8}
                            tickFormatter={(v: string) => (typeof v === 'string' ? v.replace(/\s/g, '\u00A0') : v)}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              background: '#0f172a', 
                              border: '1px solid #334155', 
                              borderRadius: '8px',
                              color: '#e5e7eb',
                              fontSize: '12px',
                              fontFamily: 'inherit',
                              padding: '8px 12px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                            }} 
                            formatter={(v: number, name: string) => [
                              <span key="value" style={{ color: '#5acce5' }}>{`${v}%`}</span>, 
                              <span key="label" style={{ color: '#e5e7eb' }}>{t('fitnessTest.page.percentile', 'Перцентиль')}</span>
                            ]} 
                            labelFormatter={(label: string) => <span style={{ color: '#e5e7eb' }}>{label}</span>}
                            cursor={{ fill: 'rgba(90, 204, 229, 0.1)' }}
                          />
                          <Bar 
                            dataKey="p" 
                            radius={[0, 6, 6, 0]} 
                            fill="url(#percentileGradient)"
                            stroke="#5acce5"
                            strokeOpacity={0.6}
                            strokeWidth={1}
                            isAnimationActive={false}
                            activeBar={{ fill: "url(#percentileGradient)", stroke: "#5acce5", strokeOpacity: 0.6, strokeWidth: 1 }}
                          >
                            <LabelList 
                              position="right" 
                              formatter={(v: number) => `${v}%`} 
                              style={{ fill: '#7dd3fc', fontSize: 12, fontWeight: 500 }} 
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-vista-light/60 text-center text-sm py-6">{t('fitnessTest.page.no_data', 'Нет данных')}</div>
                    );})()}
                  </div>
                </CardContent>
              </Card>

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
        newTestHigherIsBetter={newTestHigherIsBetter}
        setNewTestHigherIsBetter={setNewTestHigherIsBetter}
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