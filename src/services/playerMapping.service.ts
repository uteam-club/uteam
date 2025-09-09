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
  source?: 'saved' | 'fuzzy';
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
      console.log('🔍 Found existing mapping for', reportName, ':', existingMapping);
      
      // Проверяем, что игрок все еще существует
      const playerData = await db
        .select()
        .from(player)
        .where(eq(player.id, existingMapping.playerId))
        .limit(1);

      if (playerData.length === 0) {
        // Игрок не найден - удаляем битую связку
        if (process.env.GPS_DEBUG === '1') {
          await db
            .delete(playerMapping)
            .where(eq(playerMapping.id, existingMapping.id));
          console.log('[AUTO-MATCH] removed stale mapping', existingMapping.id);
        }
        // Продолжаем обычный fuzzy поиск
      } else {
        console.log('🔍 Player data for existing mapping:', playerData);
        return {
          reportName,
          suggestedPlayer: playerData[0] || null,
          confidence: existingMapping.confidenceScore,
          alternatives: [],
          action: 'confirm',
          mappingId: existingMapping.id,
          source: 'saved'
        };
      }
    }

    // 2. Ищем игроков в команде
    const teamPlayers = await db
      .select()
      .from(player)
      .where(eq(player.teamId, teamId));

    // 3. Выполняем нечеткое сопоставление
    const matches = this.fuzzyMatch(reportName, teamPlayers);
    console.log('🔍 Fuzzy matches for', reportName, ':', matches);
    
    if (matches.length === 0) {
      console.log('🔍 No matches found for', reportName);
      return {
        reportName,
        suggestedPlayer: null,
        confidence: 0,
        alternatives: [],
        action: 'create' // Игрок отсутствует в системе
      };
    }

    const bestMatch = matches[0];
    console.log('🔍 Best match for', reportName, ':', bestMatch);
    
    // Если лучший score <= 0, возвращаем manual
    if (bestMatch.score <= 0) {
      return {
        reportName,
        suggestedPlayer: null,
        confidence: 0,
        alternatives: [],
        action: 'manual'
      };
    }
    
    const AUTO_CONFIRM_THRESHOLD = 0.30; // покрывает все диапазоны: низкий (30%+), средний (50%+), высокий (80%+)

    const score = bestMatch?.score ?? 0;
    const action = score >= AUTO_CONFIRM_THRESHOLD ? 'confirm' : 'manual';
    
    return {
      reportName,
      action,
      confidence: score,
      suggestedPlayer: bestMatch?.player ?? null,
      alternatives: [], // Убираем альтернативы
      source: 'fuzzy'
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
   * Токенизация имени
   */
  private static tokens(n: string): string[] {
    return this.normalizeName(n)
      .replace(/[-''']+/g, ' ')
      .split(' ')
      .filter(Boolean);
  }

  /**
   * Жаккард по множествам токенов
   */
  private static tokenSetScore(a: string[], b: string[]): number {
    if (!a.length || !b.length) return 0;
    const A = new Set(a), B = new Set(b);
    let inter = 0;
    for (const t of A) if (B.has(t)) inter++;
    const union = A.size + B.size - inter;
    return inter / union; // 0..1
  }

  /**
   * LCS по токенам (сохраняет порядок)
   */
  private static tokenLcsScore(a: string[], b: string[]): number {
    const m = a.length, n = b.length;
    if (!m || !n) return 0;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    return dp[m][n] / Math.max(m, n); // 0..1
  }

  /**
   * Посимвольная близость (грубо)
   */
  private static charLcsScore(s1: string, s2: string): number {
    const a = this.normalizeName(s1).replace(/\s+/g, '');
    const b = this.normalizeName(s2).replace(/\s+/g, '');
    if (!a.length || !b.length) return 0;
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    return dp[m][n] / Math.max(m, n);
  }

  /**
   * Проверка перестановки двух токенов
   */
  private static isTwoTokenPermutation(a: string[], b: string[]) {
    if (a.length === 2 && b.length === 2) {
      return (a[0] === b[1] && a[1] === b[0]);
    }
    return false;
  }

  /**
   * Проверка подмножества с лишними токенами (middle names, extra surnames)
   */
  private static isSubsetWithOneExtra(a: string[], b: string[]) {
    const A = new Set(a), B = new Set(b);
    const inter = [...A].filter(t => B.has(t)).length;
    const minLen = Math.min(a.length, b.length);
    const maxLen = Math.max(a.length, b.length);
    // почти полный матч: все токены меньшего множества найдены в большем, разница длины не более 2
    return inter === minLen && (maxLen - minLen) <= 2;
  }

  /**
   * Вычисление схожести между именами
   */
  private static calculateSimilarity(name1: string, name2: string): number {
    if (!name1 || !name2) return 0;

    const n1 = this.normalizeName(name1);
    const n2 = this.normalizeName(name2);
    if (n1 === n2) return 1;

    const t1 = this.tokens(name1);
    const t2 = this.tokens(name2);

    // базовые суб-скоринги
    const set = this.tokenSetScore(t1, t2);     // Жаккард по токенам (0..1)
    const order = this.tokenLcsScore(t1, t2);   // LCS по токенам (0..1)
    const chars = this.charLcsScore(name1, name2); // LCS по символам (0..1)

    // мягкий пенальти за лишние токены
    const lenDiff = Math.abs(t1.length - t2.length);
    const lenPenalty = 1 - Math.min(1, lenDiff / Math.max(t1.length, t2.length)); // 0..1

    // базовый композит
    let score = (0.60 * set + 0.25 * order + 0.15 * chars) * (0.9 + 0.1 * lenPenalty);

    // Бусты для типовых кейсов:
    // 1) «ФИ» ↔ «ИФ» (перестановка двух токенов)
    if (this.isTwoTokenPermutation(t1, t2)) score = Math.max(score, 0.95);

    // 2) Совпадение по всем токенам меньшего множества, а у второго один "лишний" (middle/extra surname)
    if (this.isSubsetWithOneExtra(t1, t2)) score = Math.max(score, 0.92);

    // никакого 1.0 для разных строк
    return Math.max(0, Math.min(score, 0.99));
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
    const result = await db
      .select({
        mapping: playerMapping,
        player: {
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          middleName: player.middleName,
          number: player.number
        }
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

    if (process.env.GPS_DEBUG === '1') {
      console.log('[GPS-DEBUG] getTeamMappings result:', JSON.stringify(result, null, 2));
    }
    
    return result;
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