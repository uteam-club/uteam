import { z } from 'zod';
import { CANON } from '@/canon/metrics.registry';

// Множество валидных ключей канонических метрик
export const CanonKeysSet = new Set(CANON.metrics.map(m => m.key));

export const ColumnMappingItemSchema = z.object({
  type: z.enum(['column', 'formula']).default('column'),
  name: z.string().min(1, 'Название колонки обязательно'),
  mappedColumn: z.string().min(1, 'mappedColumn обязателен').optional(),
  canonicalKey: z.string().optional(),
  isVisible: z.boolean().default(true),
  order: z.number().int().nonnegative().default(0),
  formula: z.string().optional()
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
    } else if (!CanonKeysSet.has(val.canonicalKey)) {
      ctx.addIssue({ 
        code: z.ZodIssueCode.custom, 
        message: `Неизвестный canonicalKey: ${val.canonicalKey}. Доступные ключи: ${Array.from(CanonKeysSet).slice(0, 5).join(', ')}...`,
        path: ['canonicalKey']
      });
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
