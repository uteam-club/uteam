import { db } from '@/lib/db';
import { playerMapping, player, team } from '@/db/schema';
import { eq, and, or, like, desc } from 'drizzle-orm';

export interface PlayerMappingResult {
  reportName: string;
  suggestedPlayer: any | null;
  confidence: number;
  alternatives: any[];
  action: 'confirm' | 'create' | 'skip' | 'manual';
  mappingId?: string;
}

export interface PlayerMappingInput {
  reportName: string;
  gpsSystem: string;
  teamId: string;
  clubId: string;
  createdById: string;
}

export class PlayerMappingService {
  /**
   * Находит существующий маппинг для игрока
   */
  static async findExistingMapping(
    reportName: string, 
    gpsSystem: string, 
    teamId: string, 
    clubId: string
  ) {
    const existing = await db
      .select()
      .from(playerMapping)
      .where(
        and(
          eq(playerMapping.reportName, reportName),
          eq(playerMapping.teamId, teamId),
          eq(playerMapping.clubId, clubId),
          eq(playerMapping.isActive, true)
        )
      )
      .limit(1);

    return existing[0] || null;
  }

  /**
   * Выполняет автоматическое сопоставление игрока
   */
  static async autoMatchPlayer(
    reportName: string,
    teamId: string,
    clubId: string,
    gpsSystem?: string
  ): Promise<PlayerMappingResult> {
    // 1. Проверяем существующий маппинг
    const existingMapping = await this.findExistingMapping(reportName, gpsSystem || 'unknown', teamId, clubId);
    if (existingMapping) {
      const playerData = await db
        .select()
        .from(player)
        .where(eq(player.id, existingMapping.playerId))
        .limit(1);

      return {
        reportName,
        suggestedPlayer: playerData[0] || null,
        confidence: existingMapping.confidenceScore,
        alternatives: [],
        action: 'confirm',
        mappingId: existingMapping.id
      };
    }

    // 2. Ищем игроков в команде
    const teamPlayers = await db
      .select()
      .from(player)
      .where(eq(player.teamId, teamId));

    // 3. Выполняем нечеткое сопоставление
    const matches = this.fuzzyMatch(reportName, teamPlayers);
    
    if (matches.length === 0) {
      return {
        reportName,
        suggestedPlayer: null,
        confidence: 0,
        alternatives: [],
        action: 'create'
      };
    }

    const bestMatch = matches[0];
    
    return {
      reportName,
      suggestedPlayer: bestMatch.player,
      confidence: bestMatch.score,
      alternatives: matches.slice(1, 3).map(m => m.player), // Следующие 2 альтернативы
      action: bestMatch.score > 0.8 ? 'confirm' : 'manual'
    };
  }

  /**
   * Нечеткое сопоставление имен
   */
  private static fuzzyMatch(reportName: string, players: any[]): Array<{player: any, score: number}> {
    const normalizedReportName = this.normalizeName(reportName);
    
    return players
      .map(player => {
        // Создаем полное имя из firstName и lastName
        const fullName = `${player.firstName || ''} ${player.lastName || ''}`.trim();
        const normalizedPlayerName = this.normalizeName(fullName);
        const score = this.calculateSimilarity(normalizedReportName, normalizedPlayerName);
        
        return { player, score };
      })
      .filter(match => match.score > 0.3) // Минимальный порог схожести
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Нормализация имени для сравнения
   */
  private static normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[ёе]/g, 'е') // Заменяем ё на е
      .replace(/[^а-яa-z\s]/g, '') // Убираем все кроме букв и пробелов
      .replace(/\s+/g, ' '); // Множественные пробелы в один
  }

  /**
   * Вычисление схожести между именами
   */
  private static calculateSimilarity(name1: string, name2: string): number {
    if (name1 === name2) return 1.0;
    
    // Точное совпадение после нормализации
    if (this.normalizeName(name1) === this.normalizeName(name2)) {
      return 0.95;
    }

    // Проверяем, содержит ли одно имя другое
    if (name1.includes(name2) || name2.includes(name1)) {
      return 0.85;
    }

    // Разбиваем на слова и сравниваем
    const words1 = name1.split(' ').filter(w => w.length > 0);
    const words2 = name2.split(' ').filter(w => w.length > 0);
    
    if (words1.length === 0 || words2.length === 0) return 0;

    // Считаем общие слова
    const commonWords = words1.filter(word1 => 
      words2.some(word2 => this.wordSimilarity(word1, word2) > 0.8)
    );

    const similarity = commonWords.length / Math.max(words1.length, words2.length);
    return similarity;
  }

  /**
   * Схожесть отдельных слов
   */
  private static wordSimilarity(word1: string, word2: string): number {
    if (word1 === word2) return 1.0;
    
    // Левенштейн расстояние
    const distance = this.levenshteinDistance(word1, word2);
    const maxLength = Math.max(word1.length, word2.length);
    
    return 1 - (distance / maxLength);
  }

  /**
   * Алгоритм Левенштейна для вычисления расстояния редактирования
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // удаление
          matrix[j - 1][i] + 1, // вставка
          matrix[j - 1][i - 1] + indicator // замена
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Сохраняет маппинг игрока
   */
  static async saveMapping(
    reportName: string,
    playerId: string,
    gpsSystem: string,
    teamId: string,
    clubId: string,
    createdById: string,
    confidenceScore: number,
    mappingType: 'exact' | 'fuzzy' | 'manual' | 'alias',
    notes?: string
  ) {
    // Деактивируем старые маппинги для этого имени
    await db
      .update(playerMapping)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(playerMapping.reportName, reportName),
          eq(playerMapping.gpsSystem, gpsSystem),
          eq(playerMapping.teamId, teamId),
          eq(playerMapping.clubId, clubId)
        )
      );

    // Создаем новый маппинг
    const [newMapping] = await db
      .insert(playerMapping)
      .values({
        reportName,
        playerId,
        gpsSystem,
        teamId,
        clubId,
        createdById,
        confidenceScore,
        mappingType,
        notes,
        isActive: true
      })
      .returning();

    return newMapping;
  }

  /**
   * Получает все маппинги для команды
   */
  static async getTeamMappings(teamId: string, clubId: string) {
    return await db
      .select({
        mapping: playerMapping,
        player: player
      })
      .from(playerMapping)
      .leftJoin(player, eq(playerMapping.playerId, player.id))
      .where(
        and(
          eq(playerMapping.teamId, teamId),
          eq(playerMapping.clubId, clubId),
          eq(playerMapping.isActive, true)
        )
      )
      .orderBy(desc(playerMapping.updatedAt));
  }

  /**
   * Удаляет маппинг
   */
  static async deleteMapping(mappingId: string, clubId: string) {
    return await db
      .update(playerMapping)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(playerMapping.id, mappingId),
          eq(playerMapping.clubId, clubId)
        )
      );
  }
} 