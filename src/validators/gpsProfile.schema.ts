import { z } from 'zod';
import { CANON } from '@/canon/metrics.registry';

// Множество валидных ключей канонических метрик
export const CanonKeysSet = new Set(CANON.metrics.map(m => m.key));

// Множество deprecated метрик
export const DeprecatedKeysSet = new Set(CANON.metrics.filter(m => m.deprecated === true).map(m => m.key));

// Множество активных (не deprecated) метрик
export const ActiveKeysSet = new Set(CANON.metrics.filter(m => m.deprecated !== true).map(m => m.key));

// Функция для получения метрики по ключу
const getMetricByKey = (key: string) => CANON.metrics.find(m => m.key === key);

// Функция для определения displayUnit по умолчанию
const getDefaultDisplayUnit = (canonicalKey: string): string => {
  const metric = getMetricByKey(canonicalKey);
  if (!metric) return '';
  
  const { dimension, unit } = metric;
  
  // ratio/ratio → по умолчанию '%'
  if (dimension === 'ratio' && unit === 'ratio') {
    return '%';
  }
  
  // speed m/s → по умолчанию 'km/h'
  if (dimension === 'speed' && unit === 'm/s') {
    return 'km/h';
  }
  
  // time s → по умолчанию 'min'
  if (dimension === 'time' && unit === 's') {
    return 'min';
  }
  
  // distance m → по умолчанию 'km'
  if (dimension === 'distance' && unit === 'm') {
    return 'km';
  }
  
  // Для остальных возвращаем canonical unit
  return unit;
};

export const ColumnMappingItemSchema = z.object({
  type: z.enum(['column', 'formula']).default('column'),
  name: z.string().min(1, 'Название колонки обязательно'),
  mappedColumn: z.string().min(1, 'mappedColumn обязателен').optional(),
  canonicalKey: z.string().optional(),
  isVisible: z.boolean().default(true),
  order: z.number().int().nonnegative().default(0),
  formula: z.string().optional(),
  displayUnit: z.string().optional()
}).superRefine((val, ctx) => {
  if (val.type === 'column') {
    if (!val.mappedColumn) {
      ctx.addIssue({ 
        code: z.ZodIssueCode.custom, 
        message: 'mappedColumn обязателен для type=column',
        path: ['mappedColumn']
      });
    }
    if (!val.canonicalKey) {
      ctx.addIssue({ 
        code: z.ZodIssueCode.custom, 
        message: 'canonicalKey обязателен для type=column',
        path: ['canonicalKey']
      });
    } else {
      // Проверяем, что метрика существует
      if (!CanonKeysSet.has(val.canonicalKey)) {
        ctx.addIssue({ 
          code: z.ZodIssueCode.custom, 
          message: `Неизвестный canonicalKey: ${val.canonicalKey}. Доступные ключи: ${Array.from(ActiveKeysSet).slice(0, 5).join(', ')}...`,
          path: ['canonicalKey']
        });
      }
      // Проверяем, что метрика не deprecated
      else if (DeprecatedKeysSet.has(val.canonicalKey)) {
        const metric = getMetricByKey(val.canonicalKey);
        ctx.addIssue({ 
          code: z.ZodIssueCode.custom, 
          message: `Метрика «${metric?.labels?.ru || val.canonicalKey}» устарела и недоступна`,
          path: ['canonicalKey']
        });
      }
      // Проверяем displayUnit
      else {
        const metric = getMetricByKey(val.canonicalKey);
        if (metric) {
          const { dimension, unit } = metric;
          
          // Для ratio/ratio требуем displayUnit
          if (dimension === 'ratio' && unit === 'ratio' && !val.displayUnit) {
            ctx.addIssue({ 
              code: z.ZodIssueCode.custom, 
              message: `Не указана единица отображения для «${metric.labels?.ru || val.canonicalKey}». Доступные: %, ratio`,
              path: ['displayUnit']
            });
          }
          // Для speed m/s проверяем валидность displayUnit
          else if (dimension === 'speed' && unit === 'm/s' && val.displayUnit) {
            const validUnits = ['m/s', 'km/h'];
            if (!validUnits.includes(val.displayUnit)) {
              ctx.addIssue({ 
                code: z.ZodIssueCode.custom, 
                message: `Недопустимая единица отображения для «${metric.labels?.ru || val.canonicalKey}». Доступные: ${validUnits.join(', ')}`,
                path: ['displayUnit']
              });
            }
          }
          // Для time проверяем валидность displayUnit
          else if (dimension === 'time' && val.displayUnit) {
            const validUnits = ['s', 'min', 'h'];
            if (!validUnits.includes(val.displayUnit)) {
              ctx.addIssue({ 
                code: z.ZodIssueCode.custom, 
                message: `Недопустимая единица отображения для «${metric.labels?.ru || val.canonicalKey}». Доступные: ${validUnits.join(', ')}`,
                path: ['displayUnit']
              });
            }
          }
          // Для distance проверяем валидность displayUnit
          else if (dimension === 'distance' && val.displayUnit) {
            const validUnits = ['m', 'km', 'yd'];
            if (!validUnits.includes(val.displayUnit)) {
              ctx.addIssue({ 
                code: z.ZodIssueCode.custom, 
                message: `Недопустимая единица отображения для «${metric.labels?.ru || val.canonicalKey}». Доступные: ${validUnits.join(', ')}`,
                path: ['displayUnit']
              });
            }
          }
        }
      }
    }
  }
});

// Схема для конфигурации визуализации
const VisualizationConfigSchema = z.object({
  hiddenCanonicalKeys: z.array(z.string()).optional().default([]),
}).optional().default({ hiddenCanonicalKeys: [] });

export const CreateGpsProfileSchema = z.object({
  name: z.string().min(1, 'Название профиля обязательно'),
  description: z.string().optional(),
  gpsSystem: z.string().min(1, 'GPS система обязательна'),
  columns: z.array(ColumnMappingItemSchema).min(1, 'Добавьте хотя бы одну колонку'),
  visualizationConfig: VisualizationConfigSchema
}).superRefine((val, ctx) => {
  const cols = (val.columns ?? []).filter(c => c?.type === 'column' && c?.canonicalKey);
  const seen = new Map<string, number[]>();
  cols.forEach((c, idx) => {
    const key = String(c.canonicalKey).trim().toLowerCase();
    if (!key) return;
    const arr = seen.get(key) ?? [];
    arr.push(idx);
    seen.set(key, arr);
  });
  for (const [key, idxs] of seen) {
    if (idxs.length > 1) {
      idxs.forEach(i => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['columns', i, 'canonicalKey'],
          message: `Каноническая метрика уже выбрана в другой строке: ${key}`
        });
      });
    }
  }
});

export const UpdateGpsProfileSchema = z.object({
  name: z.string().min(1, 'Название профиля обязательно').optional(),
  description: z.string().optional(),
  gpsSystem: z.string().min(1, 'GPS система обязательна').optional(),
  columns: z.array(ColumnMappingItemSchema).min(1, 'Добавьте хотя бы одну колонку').optional(),
  visualizationConfig: VisualizationConfigSchema.optional()
}).superRefine((val, ctx) => {
  const cols = (val.columns ?? []).filter(c => c?.type === 'column' && c?.canonicalKey);
  const seen = new Map<string, number[]>();
  cols.forEach((c, idx) => {
    const key = String(c.canonicalKey).trim().toLowerCase();
    if (!key) return;
    const arr = seen.get(key) ?? [];
    arr.push(idx);
    seen.set(key, arr);
  });
  for (const [key, idxs] of seen) {
    if (idxs.length > 1) {
      idxs.forEach(i => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['columns', i, 'canonicalKey'],
          message: `Каноническая метрика уже выбрана в другой строке: ${key}`
        });
      });
    }
  }
});

// TypeScript типы
export type ColumnMappingItem = z.infer<typeof ColumnMappingItemSchema>;
export type CreateGpsProfileInput = z.infer<typeof CreateGpsProfileSchema>;
export type UpdateGpsProfileInput = z.infer<typeof UpdateGpsProfileSchema>;
