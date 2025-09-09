import { db } from '@/lib/db';
import { gpsReport, gpsProfile, gpsMetric } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as XLSX from 'xlsx';

const GPS_ENABLE_CUSTOM_FORMULAS = process.env.GPS_ENABLE_CUSTOM_FORMULAS === 'true';

export interface GpsDataRow {
  [key: string]: any;
}

export interface ProcessedGpsData {
  players: PlayerGpsData[];
  summary: GpsSummary;
  metadata: GpsMetadata;
}

export interface PlayerGpsData {
  playerId: string;
  playerName: string;
  metrics: Record<string, number>;
  customMetrics: Record<string, number>;
}

export interface GpsSummary {
  totalPlayers: number;
  totalDistance: number;
  averageDistance: number;
  maxSpeed: number;
  averageSpeed: number;
  totalTime: number;
}

export interface GpsMetadata {
  eventType: 'TRAINING' | 'MATCH';
  eventId: string;
  gpsSystem: string;
  processedAt: string;
  profileId: string;
}

export class GpsDataProcessor {
  private rawData: GpsDataRow[];
  private profile: any;
  private columnMapping: Record<string, string>;

  constructor(rawData: GpsDataRow[], profile: any) {
    this.rawData = rawData;
    this.profile = profile;
    this.columnMapping = profile.columnMapping || {};
  }

  /**
   * Обрабатывает сырые GPS данные согласно профилю
   */
  async processData(): Promise<ProcessedGpsData> {
    const players = this.groupDataByPlayer();
    const processedPlayers = await this.processPlayers(players);
    const summary = this.calculateSummary(processedPlayers);
    const metadata = this.createMetadata();

    return {
      players: processedPlayers,
      summary,
      metadata
    };
  }

  /**
   * Группирует данные по игрокам
   */
  private groupDataByPlayer(): Record<string, GpsDataRow[]> {
    const playerColumn = this.columnMapping.playerName || 'Player Name';
    const players: Record<string, GpsDataRow[]> = {};

    this.rawData.forEach(row => {
      const playerName = row[playerColumn];
      if (playerName && playerName !== '') {
        if (!players[playerName]) {
          players[playerName] = [];
        }
        players[playerName].push(row);
      }
    });

    return players;
  }

  /**
   * Обрабатывает данные для каждого игрока
   */
  private async processPlayers(players: Record<string, GpsDataRow[]>): Promise<PlayerGpsData[]> {
    const processedPlayers: PlayerGpsData[] = [];

    for (const [playerName, playerData] of Object.entries(players)) {
      const metrics = this.calculateMetrics(playerData);
      const customMetrics = await this.calculateCustomMetrics(playerData, metrics);

      processedPlayers.push({
        playerId: this.generatePlayerId(playerName),
        playerName,
        metrics,
        customMetrics
      });
    }

    return processedPlayers;
  }

  /**
   * Вычисляет базовые метрики для игрока
   */
  private calculateMetrics(playerData: GpsDataRow[]): Record<string, number> {
    const metrics: Record<string, number> = {};
    const config = this.profile.metricsConfig || {};

    // Обрабатываем каждую метрику из конфигурации
    for (const [metricName, metricConfig] of Object.entries(config)) {
      const columnName = this.columnMapping[metricName];
      if (!columnName) continue;

      const values = playerData
        .map(row => parseFloat(row[columnName]))
        .filter(val => !isNaN(val));

      if (values.length === 0) {
        metrics[metricName] = 0;
        continue;
      }

      // Вычисляем значение в зависимости от типа агрегации
      const aggregationType = (metricConfig as any).aggregation || 'sum';
      
      switch (aggregationType) {
        case 'sum':
          metrics[metricName] = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'average':
          metrics[metricName] = values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        case 'max':
          metrics[metricName] = Math.max(...values);
          break;
        case 'min':
          metrics[metricName] = Math.min(...values);
          break;
        default:
          metrics[metricName] = values.reduce((sum, val) => sum + val, 0);
      }

      // Округляем до 2 знаков после запятой
      metrics[metricName] = Math.round(metrics[metricName] * 100) / 100;
    }

    return metrics;
  }

  /**
   * Вычисляет кастомные метрики на основе формул
   */
  private async calculateCustomMetrics(
    playerData: GpsDataRow[], 
    baseMetrics: Record<string, number>
  ): Promise<Record<string, number>> {
    if (!GPS_ENABLE_CUSTOM_FORMULAS) {
      // безопасный режим: игнорируем пользовательские формулы
      return {};
    }

    const customMetrics: Record<string, number> = {};
    const customFormulas = this.profile.customFormulas || {};

    for (const [metricName, formula] of Object.entries(customFormulas)) {
      try {
        // Создаем безопасную функцию для вычисления формулы
        const formulaFunction = new Function('metrics', 'playerData', `
          const { ${Object.keys(baseMetrics).join(', ')} } = metrics;
          return ${formula};
        `);

        const result = formulaFunction(baseMetrics, playerData);
        customMetrics[metricName] = typeof result === 'number' ? 
          Math.round(result * 100) / 100 : 0;
      } catch (error) {
        console.error(`Ошибка при вычислении кастомной метрики ${metricName}:`, error);
        customMetrics[metricName] = 0;
      }
    }

    return customMetrics;
  }

  /**
   * Вычисляет общую сводку по всем игрокам
   */
  private calculateSummary(players: PlayerGpsData[]): GpsSummary {
    const totalPlayers = players.length;
    let totalDistance = 0;
    let maxSpeed = 0;
    let totalTime = 0;

    const toNum = (v: any) => (v === null || v === undefined || v === '') ? undefined : Number(v);
    const addIfNum = (sum: number, v: any) => {
      const n = toNum(v);
      return Number.isFinite(n) ? sum + (n as number) : sum;
    };

    players.forEach(player => {
      totalDistance = addIfNum(totalDistance, player.metrics.distance);
      totalTime     = addIfNum(totalTime,     player.metrics.time);

      const nMax = toNum(player.metrics.maxSpeed);
      if (Number.isFinite(nMax)) {
        maxSpeed = Math.max(maxSpeed, nMax as number);
      }
    });

    return {
      totalPlayers,
      totalDistance: Math.round(totalDistance * 100) / 100,
      averageDistance: totalPlayers > 0 ? Math.round((totalDistance / totalPlayers) * 100) / 100 : 0,
      maxSpeed: Math.round(maxSpeed * 100) / 100,
      averageSpeed: totalTime > 0 ? Math.round((totalDistance / totalTime) * 100) / 100 : 0,
      totalTime: Math.round(totalTime * 100) / 100
    };
  }

  /**
   * Создает метаданные отчета
   */
  private createMetadata(): GpsMetadata {
    return {
      eventType: this.profile.eventType || 'TRAINING',
      eventId: this.profile.eventId || '',
      gpsSystem: this.profile.gpsSystem || 'Unknown',
      processedAt: new Date().toISOString(),
      profileId: this.profile.id || ''
    };
  }

  /**
   * Генерирует ID игрока на основе имени
   */
  private generatePlayerId(playerName: string): string {
    return `player_${playerName.toLowerCase().replace(/\s+/g, '_')}`;
  }
}

/**
 * Получает GPS отчет по ID
 */
export async function getGpsReportById(reportId: string) {
  const [report] = await db
    .select()
    .from(gpsReport)
    .where(eq(gpsReport.id, reportId));

  return report;
}

/**
 * Получает профиль GPS по ID
 */
export async function getGpsProfileById(profileId: string) {
  const [profile] = await db
    .select()
    .from(gpsProfile)
    .where(eq(gpsProfile.id, profileId));

  return profile;
}

/**
 * Обрабатывает GPS отчет
 */
export async function processGpsReport(reportId: string): Promise<ProcessedGpsData> {
  const report = await getGpsReportById(reportId);
  if (!report) {
    throw new Error('GPS отчет не найден');
  }

  const profile = await getGpsProfileById(report.profileId);
  if (!profile) {
    throw new Error('Профиль GPS не найден');
  }

  const processor = new GpsDataProcessor(report.rawData as GpsDataRow[], profile);
  const processedData = await processor.processData();

  // Обновляем отчет с обработанными данными
  await db
    .update(gpsReport)
    .set({
      processedData,
      isProcessed: true,
      updatedAt: new Date()
    })
    .where(eq(gpsReport.id, reportId));

  return processedData;
}

/**
 * Создает стандартный профиль для B-SIGHT
 */
export function createDefaultBSightProfile(clubId: string, createdById: string) {
  return {
    name: 'B-SIGHT Стандартный',
    description: 'Стандартный профиль для отчетов B-SIGHT',
    gpsSystem: 'B-SIGHT',
    isDefault: true,
    isActive: true,
    visualizationConfig: {
      charts: [
        {
          type: 'bar',
          title: 'Дистанция по игрокам',
          metric: 'distance',
          color: '#3B82F6'
        },
        {
          type: 'line',
          title: 'Скорость по времени',
          metric: 'speed',
          color: '#10B981'
        }
      ]
    },
    metricsConfig: {
      distance: { aggregation: 'sum', unit: 'м' },
      time: { aggregation: 'sum', unit: 'мин' },
      maxSpeed: { aggregation: 'max', unit: 'км/ч' },
      averageSpeed: { aggregation: 'average', unit: 'км/ч' },
      sprints: { aggregation: 'sum', unit: 'шт' },
      highIntensityDistance: { aggregation: 'sum', unit: 'м' }
    },
    customFormulas: {
      distancePerMinute: 'distance / time * 60',
      sprintPercentage: 'sprints / time * 100',
      highIntensityPercentage: 'highIntensityDistance / distance * 100'
    },
    columnMapping: {
      playerName: 'Player Name',
              distance: 'Total Distance (m)',
        time: 'Time (min)',
        maxSpeed: 'Max Speed (km/h)',
        averageSpeed: 'Average Speed (km/h)',
      sprints: 'Sprints',
      highIntensityDistance: 'High Intensity Distance (m)'
    },
    dataFilters: {},
    clubId,
    createdById
  };
} 