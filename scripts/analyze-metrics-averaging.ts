import { db } from '@/lib/db';
import { gpsCanonicalMetric } from '@/db/schema/gpsCanonicalMetric';

interface MetricAnalysis {
  code: string;
  name: string;
  category: string;
  dimension: string;
  canonicalUnit: string;
  canAverage: boolean;
  reason: string;
  alternatives: string[];
}

function analyzeMetricForAveraging(metric: any): MetricAnalysis {
  const { code, name, category, dimension, canonicalUnit } = metric;
  
  // Метрики идентификации - нельзя усреднять
  if (category === 'identity' || dimension === 'identity') {
    return {
      code,
      name,
      category,
      dimension,
      canonicalUnit,
      canAverage: false,
      reason: 'Метрика идентификации - уникальное значение для каждого игрока',
      alternatives: ['Показывать как есть', 'Группировать по значениям']
    };
  }
  
  // Максимальные значения - нельзя усреднять
  if (code.includes('max_') || name.toLowerCase().includes('максимальн')) {
    return {
      code,
      name,
      category,
      dimension,
      canonicalUnit,
      canAverage: false,
      reason: 'Максимальное значение - пиковый показатель, усреднение искажает смысл',
      alternatives: ['Показывать максимальное из группы', 'Показывать медиану', 'Показывать диапазон']
    };
  }
  
  // Количественные метрики (счетчики) - можно усреднять
  if (dimension === 'count') {
    return {
      code,
      name,
      category,
      dimension,
      canonicalUnit,
      canAverage: true,
      reason: 'Количественная метрика - среднее количество событий имеет смысл',
      alternatives: ['Среднее арифметическое', 'Сумма', 'Медиана']
    };
  }
  
  // Временные метрики - можно усреднять
  if (dimension === 'time') {
    return {
      code,
      name,
      category,
      dimension,
      canonicalUnit,
      canAverage: true,
      reason: 'Временная метрика - среднее время имеет смысл',
      alternatives: ['Среднее арифметическое', 'Сумма', 'Медиана', 'Процент от общего времени']
    };
  }
  
  // Дистанционные метрики - можно усреднять
  if (dimension === 'distance') {
    return {
      code,
      name,
      category,
      dimension,
      canonicalUnit,
      canAverage: true,
      reason: 'Дистанционная метрика - средняя дистанция имеет смысл',
      alternatives: ['Среднее арифметическое', 'Сумма', 'Медиана', 'Процент от общей дистанции']
    };
  }
  
  // Скоростные метрики - зависит от типа
  if (dimension === 'speed') {
    if (code.includes('avg_') || name.toLowerCase().includes('средн')) {
      return {
        code,
        name,
        category,
        dimension,
        canonicalUnit,
        canAverage: true,
        reason: 'Средняя скорость - уже является усредненным показателем',
        alternatives: ['Среднее арифметическое', 'Взвешенное среднее по времени']
      };
    } else {
      return {
        code,
        name,
        category,
        dimension,
        canonicalUnit,
        canAverage: false,
        reason: 'Скоростная метрика - усреднение может исказить пиковые значения',
        alternatives: ['Максимальное значение', 'Медиана', 'Процентили']
      };
    }
  }
  
  // Процентные метрики - можно усреднять
  if (dimension === 'ratio' || canonicalUnit === '%') {
    return {
      code,
      name,
      category,
      dimension,
      canonicalUnit,
      canAverage: true,
      reason: 'Процентная метрика - средний процент имеет смысл',
      alternatives: ['Среднее арифметическое', 'Медиана', 'Взвешенное среднее']
    };
  }
  
  // Ускорения - зависит от типа
  if (dimension === 'acceleration') {
    if (code.includes('max_') || name.toLowerCase().includes('максимальн')) {
      return {
        code,
        name,
        category,
        dimension,
        canonicalUnit,
        canAverage: false,
        reason: 'Максимальное ускорение - пиковый показатель',
        alternatives: ['Максимальное значение', 'Медиана', 'Процентили']
      };
    } else {
      return {
        code,
        name,
        category,
        dimension,
        canonicalUnit,
        canAverage: true,
        reason: 'Ускорение - среднее значение имеет смысл',
        alternatives: ['Среднее арифметическое', 'Медиана', 'Стандартное отклонение']
      };
    }
  }
  
  // Пульсовые метрики - зависит от типа
  if (dimension === 'heart_rate') {
    if (code.includes('max_') || name.toLowerCase().includes('максимальн')) {
      return {
        code,
        name,
        category,
        dimension,
        canonicalUnit,
        canAverage: false,
        reason: 'Максимальный пульс - пиковый показатель',
        alternatives: ['Максимальное значение', 'Медиана', 'Процентили']
      };
    } else {
      return {
        code,
        name,
        category,
        dimension,
        canonicalUnit,
        canAverage: true,
        reason: 'Средний пульс - уже является усредненным показателем',
        alternatives: ['Среднее арифметическое', 'Медиана', 'Взвешенное среднее по времени']
      };
    }
  }
  
  // Нагрузочные метрики - можно усреднять
  if (dimension === 'load') {
    return {
      code,
      name,
      category,
      dimension,
      canonicalUnit,
      canAverage: true,
      reason: 'Нагрузочная метрика - средняя нагрузка имеет смысл',
      alternatives: ['Среднее арифметическое', 'Сумма', 'Медиана']
    };
  }
  
  // Мощность - можно усреднять
  if (dimension === 'power_mass_norm') {
    return {
      code,
      name,
      category,
      dimension,
      canonicalUnit,
      canAverage: true,
      reason: 'Мощность - средняя мощность имеет смысл',
      alternatives: ['Среднее арифметическое', 'Медиана', 'Взвешенное среднее']
    };
  }
  
  // По умолчанию - можно усреднять
  return {
    code,
    name,
    category,
    dimension,
    canonicalUnit,
    canAverage: true,
    reason: 'Неопределенная категория - предполагаем возможность усреднения',
    alternatives: ['Среднее арифметическое', 'Медиана', 'Сумма']
  };
}

async function analyzeMetricsForAveraging() {
  try {
    console.log('Анализ канонических метрик для возможности усреднения...\n');
    
    const metrics = await db.select().from(gpsCanonicalMetric);
    const analyses = metrics.map(analyzeMetricForAveraging);
    
    // Группировка по возможности усреднения
    const canAverage = analyses.filter(a => a.canAverage);
    const cannotAverage = analyses.filter(a => !a.canAverage);
    
    console.log(`=== МЕТРИКИ, КОТОРЫЕ МОЖНО УСРЕДНЯТЬ (${canAverage.length}) ===\n`);
    canAverage.forEach((analysis, index) => {
      console.log(`${index + 1}. ${analysis.code} (${analysis.name})`);
      console.log(`   Категория: ${analysis.category} | Измерение: ${analysis.dimension}`);
      console.log(`   Причина: ${analysis.reason}`);
      console.log(`   Альтернативы: ${analysis.alternatives.join(', ')}`);
      console.log('   ---');
    });
    
    console.log(`\n=== МЕТРИКИ, КОТОРЫЕ НЕЛЬЗЯ УСРЕДНЯТЬ (${cannotAverage.length}) ===\n`);
    cannotAverage.forEach((analysis, index) => {
      console.log(`${index + 1}. ${analysis.code} (${analysis.name})`);
      console.log(`   Категория: ${analysis.category} | Измерение: ${analysis.dimension}`);
      console.log(`   Причина: ${analysis.reason}`);
      console.log(`   Альтернативы: ${analysis.alternatives.join(', ')}`);
      console.log('   ---');
    });
    
    // Статистика по категориям
    console.log('\n=== СТАТИСТИКА ПО КАТЕГОРИЯМ ===\n');
    const categoryStats = analyses.reduce((acc, analysis) => {
      if (!acc[analysis.category]) {
        acc[analysis.category] = { total: 0, canAverage: 0, cannotAverage: 0 };
      }
      acc[analysis.category].total++;
      if (analysis.canAverage) {
        acc[analysis.category].canAverage++;
      } else {
        acc[analysis.category].cannotAverage++;
      }
      return acc;
    }, {} as Record<string, { total: number; canAverage: number; cannotAverage: number }>);
    
    Object.entries(categoryStats).forEach(([category, stats]) => {
      const percentage = Math.round((stats.canAverage / stats.total) * 100);
      console.log(`${category}: ${stats.canAverage}/${stats.total} (${percentage}%) можно усреднять`);
    });
    
    // Статистика по измерениям
    console.log('\n=== СТАТИСТИКА ПО ИЗМЕРЕНИЯМ ===\n');
    const dimensionStats = analyses.reduce((acc, analysis) => {
      if (!acc[analysis.dimension]) {
        acc[analysis.dimension] = { total: 0, canAverage: 0, cannotAverage: 0 };
      }
      acc[analysis.dimension].total++;
      if (analysis.canAverage) {
        acc[analysis.dimension].canAverage++;
      } else {
        acc[analysis.dimension].cannotAverage++;
      }
      return acc;
    }, {} as Record<string, { total: number; canAverage: number; cannotAverage: number }>);
    
    Object.entries(dimensionStats).forEach(([dimension, stats]) => {
      const percentage = Math.round((stats.canAverage / stats.total) * 100);
      console.log(`${dimension}: ${stats.canAverage}/${stats.total} (${percentage}%) можно усреднять`);
    });
    
    return analyses;
  } catch (error) {
    console.error('Ошибка при анализе метрик:', error);
    throw error;
  }
}

// Запускаем анализ
analyzeMetricsForAveraging()
  .then(() => {
    console.log('\nАнализ завершен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Анализ завершился с ошибкой:', error);
    process.exit(1);
  });
