'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Download, Filter } from 'lucide-react';
import { GpsAnalysisData, GpsColumnMapping } from '@/types/gps';
import { formatMetricValue, getAllowedUnitsForMetric, getCanonicalMetricByKey } from '@/lib/canonical-metrics';
import canonicalMetricsData from '@/canon/canonical_metrics_grouped_v1.0.1.json';

interface GpsDataTableProps {
  data: GpsAnalysisData[];
  columnMappings?: GpsColumnMapping[];
}

// Получаем каноническую единицу для метрики (fallback для старых записей)
const getCanonicalUnitForMetric = (metricKey: string): string => {
  const metric = getCanonicalMetricByKey(metricKey);
  if (!metric) return 'm'; // разумный дефолт
  
  const dimension = canonicalMetricsData.dimensions[metric.dimension as keyof typeof canonicalMetricsData.dimensions];
  return dimension?.canonical_unit || 'm';
};

// Функция для форматирования значения с учетом displayUnit
const formatValueWithDisplayUnit = (
  value: number, 
  canonicalMetric: string, 
  fallbackUnit: string,
  columnMappings?: GpsColumnMapping[]
): string => {
  // Находим маппинг для этой метрики
  const mapping = columnMappings?.find(m => m.canonicalMetric === canonicalMetric);
  
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

export default function GpsDataTable({ data, columnMappings }: GpsDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('playerName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Get all unique metrics from the data
  const allMetrics = Array.from(
    new Set(data.flatMap(player => Object.keys(player.metrics)))
  );

  // Filter and sort data
  const filteredData = data
    .filter(player => 
      player.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (player.position && player.position.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const aValue = a[sortField as keyof GpsAnalysisData];
      const bValue = b[sortField as keyof GpsAnalysisData];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Export data to CSV');
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Filter className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Нет данных для отображения</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск игроков..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Badge variant="outline">
            {filteredData.length} игроков
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Экспорт CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('playerName')}
                  >
                    Игрок
                    {sortField === 'playerName' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('position')}
                  >
                    Позиция
                    {sortField === 'position' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </TableHead>
                  {allMetrics.map((metricKey) => (
                    <TableHead key={metricKey} className="text-center">
                      {metricKey}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((player, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {player.playerName}
                    </TableCell>
                    <TableCell>
                      {player.position ? (
                        <Badge variant="outline">{player.position}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {allMetrics.map((metricKey) => {
                      const metric = player.metrics[metricKey];
                      return (
                        <TableCell key={metricKey} className="text-center">
                          {metric ? (
                            <div className="flex flex-col">
                              <span className="font-mono text-sm">
                                {formatValueWithDisplayUnit(
                                  metric.value, 
                                  metric.canonicalMetric, 
                                  metric.unit,
                                  columnMappings
                                )}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {metric.customName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {filteredData.length === 0 && searchTerm && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Search className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              Игроки не найдены по запросу &quot;{searchTerm}&quot;
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
