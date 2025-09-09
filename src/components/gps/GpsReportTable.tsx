import React from "react";
import { CANON } from "@/canon/metrics.registry";

type CanonicalRow = Record<string, unknown> & {
  athlete_name?: string | null;
  name?: string | null;
};

type ColumnMapItem = {
  canonicalKey: string;
  displayName?: string | null;
  name?: string | null;
  order?: number | null;
  type?: string;
};

type GpsProfileLite = {
  columnMapping?: ColumnMapItem[];
  visualizationConfig?: { hiddenCanonicalKeys?: string[] };
};

type Props = { 
  rows: CanonicalRow[]; 
  profile: GpsProfileLite;
  meta?: { 
    counts?: { 
      input?: number;
      filtered?: number;
      canonical?: number;
    };
    warnings?: string[];
  };
};

type ColumnMeta = {
  key: string;
  label: string;
  unit?: string;
  dimension: keyof typeof CANON["dimensions"];
  order?: number;
};

const formatValue = (v: any, col: { dimension?: string | number | symbol }) => {
  // 1) Пусто → "—"
  if (v === null || v === undefined || v === '') return '—';

  // 2) Пробуем привести к числу
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';

  // 3) Форматирование по размерности
  switch (col?.dimension) {
    case 'ratio':      // доли: 0.085 -> "9%"
      return `${(n * 100).toFixed(0)}%`;
    case 'count':      // целые: 1234 -> "1 234"
    case 'time':
    case 'distance':
      return Math.round(n).toLocaleString('ru-RU');
    case 'speed':      // скорость: 8.53 -> "8.5"
      return n.toFixed(1);
    default:
      return String(v);
  }
};

const toNum = (x: any) =>
  (x === null || x === undefined || x === '') ? undefined : Number(x);

export default function GpsReportTable({ rows, profile, meta }: Props) {
  const hiddenSet = new Set(profile?.visualizationConfig?.hiddenCanonicalKeys ?? []);

  const playerHeader = React.useMemo(() => {
    const col = profile?.columnMapping?.find(c => c.canonicalKey === 'athlete_name');
    return (col?.displayName || col?.name || 'Игрок').toUpperCase();
  }, [profile]);

  const mapped = (profile?.columnMapping ?? [])
    .filter((c: any) => c && c.canonicalKey && c.type !== "formula");

  const columns = mapped
    .map((c: any) => {
      const meta = CANON.metrics.find(m => m.key === c.canonicalKey);
      if (!meta) return null;
      const label =
        (c.displayName ?? "").trim() ||
        (c.name ?? "").trim() ||
        meta.labels?.ru ||
        meta.labels?.en ||
        c.canonicalKey;

      const unit = CANON.dimensions[meta.dimension]?.canonical_unit ?? "";
      return { key: c.canonicalKey, label, unit: unit || undefined, dimension: meta.dimension as any, order: c.order };
    })
    .filter(col => col !== null)
    .filter(col => col!.key !== "athlete_name" && col!.key !== "player_name")
    .sort((a, b) => (a!.order ?? 9999) - (b!.order ?? 9999)) as ColumnMeta[];

  // ⚠️ исключи возможную колонку имени из профиля — имя и так будет отдельной sticky-колонкой
  const columnsWithoutName = columns;

  if (process.env.NEXT_PUBLIC_DEBUG === '1') {
    // покажет какие реальные поля приходят в маппинге
    // и что мы выбрали в итоге
    // eslint-disable-next-line no-console
    console.debug('[GpsReportTable] mapping sample', (profile?.columnMapping ?? []).slice(0,3));
    // eslint-disable-next-line no-console
    console.debug('[GpsReportTable] columns labels', columns.map(c => c.label));
  }

  if (!rows?.length) {
    return (
      <div className="mt-6 rounded-lg border border-border/50 bg-card/30 p-10 text-center text-muted-foreground">
        Нет канонических строк для отображения.
      </div>
    );
  }

  // Временные логи для диагностики
  console.log('[GPS:UI] row0 keys=', Object.keys(rows[0] ?? {}));
  console.log('[GPS:UI] columns=', columns.map(c => ({id: c.key, accessorKey: c.key, label: c.label})));

  const averages = React.useMemo(() => {
    const sum: Record<string, number> = {};
    const cnt: Record<string, number> = {};

    for (const r of rows) {
      for (const col of columnsWithoutName) {
        const n = toNum((r as any)[col.key]);
        if (Number.isFinite(n)) {
          sum[col.key] = (sum[col.key] ?? 0) + (n as number);
          cnt[col.key] = (cnt[col.key] ?? 0) + 1;
        }
      }
    }

    const avg: Record<string, number | undefined> = {};
    for (const col of columnsWithoutName) {
      avg[col.key] = cnt[col.key] ? (sum[col.key] / cnt[col.key]) : undefined;
    }
    return avg;
  }, [rows, columnsWithoutName]);

  return (
    <div className="mt-6">
      {/* Бейдж с количеством отфильтрованных строк */}
      {meta?.counts?.filtered && meta.counts.filtered > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
            Отфильтровано: {meta.counts.filtered}
          </span>
        </div>
      )}
      
      <div className="overflow-hidden rounded-xl border border-border/50">
        <div className="w-full overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="bg-muted/40 sticky top-0 z-20">
            <tr>
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide sticky left-0 bg-muted/40 z-20">
                {playerHeader}
              </th>
              {columnsWithoutName.map(col => (
                <th key={col.key} className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-foreground">{col.label}</span>
                    {col.unit ? <span className="text-muted-foreground/70">({col.unit})</span> : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, rowIdx) => {
              const name = (r.athlete_name as string) ?? (r.name as string) ?? "—";
              return (
                <tr key={rowIdx} className={rowIdx % 2 ? "bg-muted/20" : "bg-background/20"}>
                  <td className="sticky left-0 bg-background px-3 py-2 text-sm font-medium whitespace-nowrap z-10">
                    {name}
                  </td>
                  {columnsWithoutName.map(col => (
                    <td key={col.key} className="px-3 py-2 text-sm text-right tabular-nums">
                      {formatValue(r[col.key], col)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30">
              <td className="sticky left-0 bg-muted/30 px-3 py-2 text-sm font-medium text-muted-foreground z-10">
                Средние значения
              </td>
              {columnsWithoutName.map(col => (
                <td key={col.key} className="px-3 py-2 text-sm font-medium text-muted-foreground text-right tabular-nums">
                  {formatValue(averages[col.key], col)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
        </div>
      </div>
    </div>
  );
}