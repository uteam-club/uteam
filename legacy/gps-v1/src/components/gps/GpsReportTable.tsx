import React from "react";
import { CANON } from "@/canon/metrics.registry";
import { fromCanonical, formatDisplayValue, getDisplayUnit } from "@/services/units";
import { filterCanonicalData, getPlayerNameFromRow } from "@/services/gps/dataFilter.service";
import { ProfileSnapshotColumn } from "@/types/gps";

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
  profileSnapshot?: {
    columns: ProfileSnapshotColumn[];
  };
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

const formatValue = (v: any, col: ColumnMeta, displayUnit?: string) => {
  if (v == null || v === "") return "—";
  
  // Если есть displayUnit, используем конвертер
  if (displayUnit) {
    const convertedValue = fromCanonical(v, col.key, displayUnit);
    if (convertedValue !== null) {
      return formatDisplayValue(convertedValue, displayUnit);
    }
  }
  
  // Fallback: простое отображение без конвертации
  const num = Number(v);
  if (!isFinite(num)) return "—";
  return num.toFixed(1);
};

export default function GpsReportTable({ rows, profile, profileSnapshot, meta }: Props) {
  const hiddenSet = new Set(profile?.visualizationConfig?.hiddenCanonicalKeys ?? []);

  // Фильтруем данные если есть profileSnapshot
  const { filteredRows, filteredCount, warnings } = React.useMemo(() => {
    if (!profileSnapshot?.columns) {
      return { filteredRows: rows, filteredCount: 0, warnings: [] };
    }
    return filterCanonicalData(rows, profileSnapshot.columns);
  }, [rows, profileSnapshot]);

  const playerHeader = React.useMemo(() => {
    // Используем profileSnapshot если доступен
    if (profileSnapshot?.columns) {
      const col = profileSnapshot.columns.find(c => c.canonicalKey === 'athlete_name');
      return (col?.displayName || 'Игрок').toUpperCase();
    }
    
    // Fallback к старой логике
    const col = profile?.columnMapping?.find(c => c.canonicalKey === 'athlete_name');
    return (col?.displayName || col?.name || 'Игрок').toUpperCase();
  }, [profile, profileSnapshot]);

  // Используем profileSnapshot если доступен, иначе fallback к profile
  const columns = React.useMemo(() => {
    if (profileSnapshot?.columns) {
      return profileSnapshot.columns
        .filter(col => col.isVisible && col.canonicalKey !== 'athlete_name')
        .map(col => {
          const meta = CANON.metrics.find(m => m.key === col.canonicalKey);
          if (!meta) return null;
          
          const displayUnit = getDisplayUnit(col);
          const unit = displayUnit !== 'unknown' ? displayUnit : CANON.dimensions[meta.dimension]?.canonical_unit ?? "";
          
          return { 
            key: col.canonicalKey, 
            label: col.displayName, 
            unit: unit || undefined, 
            dimension: meta.dimension as any, 
            order: col.order,
            displayUnit: col.displayUnit
          };
        })
        .filter(col => col !== null)
        .sort((a, b) => (a!.order ?? 9999) - (b!.order ?? 9999)) as (ColumnMeta & { displayUnit?: string })[];
    }
    
    // Fallback к старой логике
    const mapped = (profile?.columnMapping ?? [])
      .filter((c: any) => c && c.canonicalKey && c.type !== "formula");

    return mapped
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
  }, [profile, profileSnapshot]);

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

  if (!filteredRows?.length) {
    return (
      <div className="mt-6 rounded-lg border border-border/50 bg-card/30 p-10 text-center text-muted-foreground">
        Нет канонических строк для отображения.
        {filteredCount > 0 && (
          <div className="mt-2 text-sm">
            Отфильтровано {filteredCount} строк
          </div>
        )}
      </div>
    );
  }

  // Временные логи для диагностики
  console.log('[GPS:UI] row0 keys=', Object.keys(filteredRows[0] ?? {}));
  console.log('[GPS:UI] columns=', columns.map(c => ({id: c.key, accessorKey: c.key, label: c.label})));

  const averages = React.useMemo(() => {
    const acc: Record<string, number> = {};
    const cnt: Record<string, number> = {};
    for (const r of filteredRows) {
      for (const col of columnsWithoutName) {
        const v = r[col.key];
        const num = typeof v === "number" ? v : Number(v);
        if (Number.isFinite(num)) {
          acc[col.key] = (acc[col.key] ?? 0) + num;
          cnt[col.key] = (cnt[col.key] ?? 0) + 1;
        }
      }
    }
    const out: Record<string, number | null> = {};
    for (const col of columnsWithoutName) {
      out[col.key] = cnt[col.key] ? acc[col.key] / cnt[col.key] : null;
    }
    return out;
  }, [filteredRows, columnsWithoutName]);

  return (
    <div className="mt-6">
      {/* Бейдж с количеством отфильтрованных строк */}
      {(filteredCount > 0 || (meta?.counts?.filtered && meta.counts.filtered > 0)) && (
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
            Отфильтровано: {filteredCount || meta?.counts?.filtered || 0}
          </span>
        </div>
      )}
      
      {/* Предупреждения */}
      {warnings.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          {warnings.map((warning, index) => (
            <span key={index} className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
              {warning}
            </span>
          ))}
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
            {filteredRows.map((r, rowIdx) => {
              // Используем правильное получение имени игрока
              const name = profileSnapshot?.columns 
                ? getPlayerNameFromRow(r, profileSnapshot.columns) ?? "—"
                : (r.athlete_name as string) ?? (r.name as string) ?? "—";
              
              return (
                <tr key={rowIdx} className={rowIdx % 2 ? "bg-muted/20" : "bg-background/20"}>
                  <td className="sticky left-0 bg-background px-3 py-2 text-sm font-medium whitespace-nowrap z-10">
                    {name}
                  </td>
                  {columnsWithoutName.map(col => (
                    <td key={col.key} className="px-3 py-2 text-sm text-right tabular-nums">
                      {formatValue(r[col.key], col, (col as any).displayUnit)}
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