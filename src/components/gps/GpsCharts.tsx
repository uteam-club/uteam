'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react';
import { GpsAnalysisData, GpsColumnMapping } from '@/types/gps';
import { formatMetricValue, getAllowedUnitsForMetric, getCanonicalMetricByKey } from '@/lib/canonical-metrics';
import canonicalMetricsData from '@/canon/canonical_metrics_grouped_v1.0.1.json';

interface GpsChartsProps {
  data: GpsAnalysisData[];
  columnMappings?: GpsColumnMapping[];
}

export default function GpsCharts({ data, columnMappings = [] }: GpsChartsProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');

  // Get all unique metrics from the data
  const allMetrics = Array.from(
    new Set(data.flatMap(player => Object.keys(player.metrics)))
  );

  // Get metric options for selection
  const metricOptions = allMetrics.map(metricKey => {
    const firstPlayer = data.find(player => player.metrics[metricKey]);
    const metric = firstPlayer?.metrics[metricKey];
    return {
      key: metricKey,
      label: metric?.customName || metricKey,
      canonicalMetric: metric?.canonicalMetric || metricKey,
    };
  });

  const handleMetricChange = (metricKey: string) => {
    setSelectedMetric(metricKey);
  };

  // Получаем каноническую единицу для метрики (fallback для старых записей)
  const getCanonicalUnitForMetric = (metricKey: string): string => {
    const metric = getCanonicalMetricByKey(metricKey);
    if (!metric) return 'm'; // разумный дефолт
    
    const dimension = canonicalMetricsData.dimensions[metric.dimension as keyof typeof canonicalMetricsData.dimensions];
    return dimension?.canonical_unit || 'm';
  };

  // Функция для форматирования значения с учетом displayUnit
  const formatValue = (value: number, canonicalMetric: string) => {
    // Находим маппинг для этой метрики
    const mapping = columnMappings.find(m => m.canonicalMetric === canonicalMetric);
    
    // Определяем единицу для отображения
    let displayUnit = mapping?.displayUnit;
    
    // Если displayUnit не задан (старые записи), используем каноническую единицу
    if (!displayUnit) {
      displayUnit = getCanonicalUnitForMetric(canonicalMetric);
    }

    // Проверяем валидность displayUnit
    const allowedUnits = getAllowedUnitsForMetric(canonicalMetric);
    if (!allowedUnits.includes(displayUnit)) {
      console.warn('[gps] invalid displayUnit for', canonicalMetric, displayUnit);
      // Fallback на каноническую единицу
      displayUnit = getCanonicalUnitForMetric(canonicalMetric);
    }

    return formatMetricValue(value, canonicalMetric, displayUnit);
  };

  const getChartData = () => {
    if (!selectedMetric) return [];

    return data
      .map(player => ({
        name: player.playerName,
        value: player.metrics[selectedMetric]?.value || 0,
        position: player.position || 'Не указана',
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  };

  const chartData = getChartData();
  const selectedMetricInfo = metricOptions.find(m => m.key === selectedMetric);

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <BarChart3 className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Нет данных для отображения</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Выберите метрику</label>
            <Select value={selectedMetric} onValueChange={handleMetricChange}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Выберите метрику для анализа" />
              </SelectTrigger>
              <SelectContent>
                {metricOptions.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-medium">Тип графика</label>
            <Tabs value={chartType} onValueChange={(value) => setChartType(value as 'bar' | 'line' | 'pie')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="bar" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Столбцы
                </TabsTrigger>
                <TabsTrigger value="line" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Линия
                </TabsTrigger>
                <TabsTrigger value="pie" className="flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Круговая
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {chartData.length} игроков
          </Badge>
        </div>
      </div>

      {!selectedMetric ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Выберите метрику</h3>
            <p className="text-muted-foreground text-center">
              Выберите метрику из списка выше для построения графика
            </p>
          </CardContent>
        </Card>
      ) : chartData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <BarChart3 className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Нет данных для выбранной метрики</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Среднее значение</p>
                    <p className="text-2xl font-bold">
                      {selectedMetricInfo && chartData.length > 0
                        ? formatMetricValue(
                            chartData.reduce((sum, item) => sum + item.value, 0) / chartData.length,
                            selectedMetricInfo.canonicalMetric,
                            'auto'
                          )
                        : '—'
                      }
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Максимальное значение</p>
                    <p className="text-2xl font-bold">
                      {selectedMetricInfo && chartData.length > 0
                        ? formatMetricValue(
                            Math.max(...chartData.map(item => item.value)),
                            selectedMetricInfo.canonicalMetric,
                            'auto'
                          )
                        : '—'
                      }
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Минимальное значение</p>
                    <p className="text-2xl font-bold">
                      {selectedMetricInfo && chartData.length > 0
                        ? formatMetricValue(
                            Math.min(...chartData.map(item => item.value)),
                            selectedMetricInfo.canonicalMetric,
                            'auto'
                          )
                        : '—'
                      }
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {chartType === 'bar' && <BarChart3 className="h-5 w-5" />}
                {chartType === 'line' && <TrendingUp className="h-5 w-5" />}
                {chartType === 'pie' && <PieChart className="h-5 w-5" />}
                {selectedMetricInfo?.label || 'График'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    График будет реализован в следующей версии
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Данные готовы для отображения: {chartData.length} точек
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Table for Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Данные для графика</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {chartData.slice(0, 10).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <span className="font-medium">{item.name}</span>
                      <Badge variant="secondary">{item.position}</Badge>
                    </div>
                    <span className="font-mono">
                      {selectedMetricInfo
                        ? formatValue(item.value, selectedMetricInfo.canonicalMetric)
                        : item.value
                      }
                    </span>
                  </div>
                ))}
                {chartData.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    И еще {chartData.length - 10} игроков...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
