'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useTranslation } from 'react-i18next';

interface GpsReportVisualizationProps {
  reportId: string;
}

interface PlayerGpsData {
  playerId: string;
  playerName: string;
  metrics: Record<string, number>;
  customMetrics: Record<string, number>;
}

interface GpsSummary {
  totalPlayers: number;
  totalDistance: number;
  averageDistance: number;
  maxSpeed: number;
  averageSpeed: number;
  totalTime: number;
}

interface ProcessedGpsData {
  players: PlayerGpsData[];
  summary: GpsSummary;
  metadata: any;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

// Утилиты для безопасного отображения чисел
const toNum = (v: any) => (v === null || v === undefined || v === '') ? undefined : Number(v);
const fmtFixed = (v: any, digits: number) => {
  const n = toNum(v);
  return (typeof n === "number" && Number.isFinite(n)) ? n.toFixed(digits) : "—";
};

export default function GpsReportVisualization({ reportId }: GpsReportVisualizationProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<ProcessedGpsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportData();
  }, [reportId]);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/gps-reports/${reportId}/process`);
      if (!response.ok) {
        throw new Error('Не удалось загрузить данные отчета');
      }
      const reportData = await response.json();
      setData(reportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">Ошибка: {error}</p>
          <button 
            onClick={fetchReportData}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Данные не найдены
      </div>
    );
  }

  // Подготавливаем данные для графиков
  const distanceChartData = data.players.map(player => ({
    name: player.playerName,
    distance: toNum(player.metrics.distance) ?? null,
    time: toNum(player.metrics.time) ?? null,
    maxSpeed: toNum(player.metrics.maxSpeed) ?? null,
    averageSpeed: toNum(player.metrics.averageSpeed) ?? null,
    distancePerMinute: toNum(player.customMetrics.distancePerMinute) ?? null
  }));

  const speedChartData = data.players.map(player => ({
    name: player.playerName,
    maxSpeed: toNum(player.metrics.maxSpeed) ?? null,
    averageSpeed: toNum(player.metrics.averageSpeed) ?? null
  }));

  return (
    <div className="space-y-6">
      {/* Сводка */}
      <Card>
        <CardHeader>
          <CardTitle>Сводка по команде</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {data.summary.totalPlayers}
              </div>
              <div className="text-sm text-muted-foreground">Игроков</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data.summary.totalDistance.toFixed(0)} м
              </div>
              <div className="text-sm text-muted-foreground">Общая дистанция</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {data.summary.averageDistance.toFixed(0)} м
              </div>
              <div className="text-sm text-muted-foreground">Средняя дистанция</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {data.summary.maxSpeed.toFixed(1)} км/ч
              </div>
              <div className="text-sm text-muted-foreground">Максимальная скорость</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Графики */}
      <Tabs defaultValue="distance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="distance">Дистанция</TabsTrigger>
          <TabsTrigger value="speed">Скорость</TabsTrigger>
          <TabsTrigger value="efficiency">Эффективность</TabsTrigger>
        </TabsList>

        <TabsContent value="distance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Дистанция по игрокам</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={distanceChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="distance" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="speed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Скорость по игрокам</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={speedChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="maxSpeed" fill="#EF4444" name="Макс. скорость" />
                  <Bar dataKey="averageSpeed" fill="#10B981" name="Сред. скорость" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Эффективность (м/мин)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={distanceChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="distancePerMinute" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Детальная таблица */}
      <Card>
        <CardHeader>
          <CardTitle>Детальные данные по игрокам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Игрок</th>
                  <th className="text-right py-2">Дистанция (м)</th>
                  <th className="text-right py-2">Время (мин)</th>
                  <th className="text-right py-2">Макс. скорость (км/ч)</th>
                  <th className="text-right py-2">Сред. скорость (км/ч)</th>
                  <th className="text-right py-2">Эффективность (м/мин)</th>
                </tr>
              </thead>
              <tbody>
                {data.players.map((player, index) => (
                  <tr key={player.playerId} className="border-b hover:bg-muted/50">
                    <td className="py-2 font-medium">{player.playerName}</td>
                    <td className="text-right py-2">
                      {fmtFixed(player.metrics.distance, 0)}
                    </td>
                    <td className="text-right py-2">
                      {fmtFixed(player.metrics.time, 0)}
                    </td>
                    <td className="text-right py-2">
                      {fmtFixed(player.metrics.maxSpeed, 1)}
                    </td>
                    <td className="text-right py-2">
                      {fmtFixed(player.metrics.averageSpeed, 1)}
                    </td>
                    <td className="text-right py-2">
                      <Badge variant="secondary">
                        {fmtFixed(player.customMetrics.distancePerMinute, 1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 