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
  
  // Средние значения - нельзя усреднять (по требованию пользователя)
  if (code.includes('avg_') || name.toLowerCase().includes('средн')) {
    return {
      code,
      name,
      category,
      dimension,
      canonicalUnit,
      canAverage: false,
      reason: 'Среднее значение - уже является усредненным показателем, повторное усреднение искажает смысл',
      alternatives: ['Показывать как есть', 'Показывать медиану', 'Показывать диапазон']
    };
  }
  
  // Время участия - не нужно усреднять (по требованию пользователя)
  if (code === 'duration') {
    return {
      code,
      name,
      category,
      dimension,
      canonicalUnit,
      canAverage: false,
      reason: 'Время участия - индивидуальный показатель, усреднение не имеет смысла',
      alternatives: ['Показывать как есть', 'Показывать сумму', 'Показывать диапазон']
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
  
  // Скоростные метрики - можно усреднять (кроме max и avg)
  if (dimension === 'speed') {
    return {
      code,
      name,
      category,
      dimension,
      canonicalUnit,
      canAverage: true,
      reason: 'Скоростная метрика - средняя скорость имеет смысл',
      alternatives: ['Среднее арифметическое', 'Медиана', 'Взвешенное среднее по времени']
    };
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
  
  // Ускорения - можно усреднять (кроме max)
  if (dimension === 'acceleration') {
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
  
  // Пульсовые метрики - нельзя усреднять (по требованию пользователя)
  if (dimension === 'heart_rate') {
    return {
      code,
      name,
      category,
      dimension,
      canonicalUnit,
      canAverage: false,
      reason: 'Пульсовые метрики - индивидуальные показатели, усреднение не имеет смысла',
      alternatives: ['Показывать как есть', 'Показывать медиану', 'Показывать диапазон']
    };
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
    console.log('Анализ канонических метрик для возможности усреднения (исправленная версия)...\n');
    
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
    
    // Специальный анализ для m/min
    console.log('\n=== АНАЛИЗ МЕТРИКИ distance_per_min ===\n');
    const distancePerMin = analyses.find(a => a.code === 'distance_per_min');
    if (distancePerMin) {
      console.log(`Метрика: ${distancePerMin.code} (${distancePerMin.name})`);
      console.log(`Категория: ${distancePerMin.category} | Измерение: ${distancePerMin.dimension}`);
      console.log(`Единица измерения: ${distancePerMin.canonicalUnit}`);
      console.log(`Можно усреднять: ${distancePerMin.canAverage ? 'ДА' : 'НЕТ'}`);
      console.log(`Причина: ${distancePerMin.reason}`);
      console.log(`Альтернативы: ${distancePerMin.alternatives.join(', ')}`);
      console.log('\nОбоснование для m/min:');
      console.log('- Это производная метрика: дистанция / время');
      console.log('- Показывает интенсивность работы (метров в минуту)');
      console.log('- Среднее значение m/min для группы игроков показывает среднюю интенсивность');
      console.log('- Это не максимальное значение, а расчетная метрика');
      console.log('- Усреднение имеет смысл для сравнения команд или периодов');
    }
    
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
