import fs from "fs";
import path from "path";

// 1) Загружаем текущий реестр и конвертер
const REG_PATH = path.resolve("src/canon/metrics.registry.json");
const UNITS_PATH = path.resolve("src/canon/units.ts");

// Ленивая загрузка convertUnit/fromCanonical через eval транспиляцию — без сборки.
// Если модуль TS недоступен напрямую, мы проверим только наличие сигнатур/правил.
const codeUnits = fs.readFileSync(UNITS_PATH, "utf8");
const reg = JSON.parse(fs.readFileSync(REG_PATH, "utf8"));

// 2) Мини-эталон (вынесем критично важные метрики/правила из вашего файла v1.0.1)
// — Этого достаточно, чтобы поймать главные расхождения по скорости/процентам/времени/дистанции.
const EXPECT = {
  dimensions: {
    speed: { canonical_unit: "m/s", mustAllow: ["m/s","km/h","m/min","mph"] },
    ratio: { canonical_unit: "ratio", mustAllow: ["ratio","%"], hasConv: "%->ratio" },
    time:  { canonical_unit: "s", mustAllow: ["s","min","h","ms"] },
    distance: { canonical_unit: "m", mustAllow: ["m","km","yd"] },
  },
  metrics: [
    { key:"total_distance_m", dimension:"distance", unit:"m", derived:false },
    { key:"duration_s",      dimension:"time",     unit:"s", derived:false },
    { key:"minutes_played",  dimension:"time",     unit:"min", derived:true },              // formula: duration_s/60
    { key:"max_speed_ms",    dimension:"speed",    unit:"m/s", derived:false },
    { key:"max_speed_kmh",   dimension:"speed",    unit:"km/h", derived:true },             // formula: max_speed_ms*3.6
    { key:"distance_per_min_m", dimension:"speed", unit:"m/min", derived:true },            // formula: total_distance_m/(duration_s/60)
    { key:"work_ratio_percent", dimension:"ratio", unit:"%", derived:false },               // display % (ratio backing)
    { key:"hsr_distance_m",  dimension:"distance", unit:"m", derived:false },
  ],
  // проверим, что в конвертере есть и обратное направление km/h<->m/s и %<->ratio
  convExpect: [
    { from:"km/h", to:"m/s" },
    { from:"m/s", to:"km/h" },
    { from:"%", to:"ratio" },
    { from:"ratio", to:"%" }, // через обратный коэффициент
  ]
};

// 3) Помощники
type Dim = { canonical_unit:string, allowed_units?:string[] };
function findDim(name:string): Dim | null {
  const dims = (reg.dimensions || reg.DIMENSIONS || {});
  return dims[name] || null;
}
function findMetric(key:string) {
  const arr = reg.metrics || reg.METRICS || [];
  return arr.find((m:any)=>m.key===key) || null;
}

const issues:string[] = [];
const ok:string[] = [];

// 4) Проверка измерений
for (const [dimName, exp] of Object.entries(EXPECT.dimensions)) {
  const dim = findDim(dimName);
  if (!dim) { issues.push(`DIMENSION ❌ нет "${dimName}"`); continue; }
  if (dim.canonical_unit !== (exp as any).canonical_unit) {
    issues.push(`DIMENSION ❌ "${dimName}" canonical_unit=${dim.canonical_unit} != ${ (exp as any).canonical_unit }`);
  }
  const allowed = (dim as any).allowed_units || [];
  for (const u of (exp as any).mustAllow) {
    if (!allowed.includes(u)) issues.push(`DIMENSION ❌ "${dimName}" нет allowed_unit "${u}"`);
  }
}

// 5) Проверка ключевых метрик
for (const m of EXPECT.metrics) {
  const cur = findMetric(m.key);
  if (!cur) { issues.push(`METRIC ❌ нет "${m.key}"`); continue; }
  if (cur.dimension !== m.dimension) issues.push(`METRIC ❌ "${m.key}" dimension=${cur.dimension} != ${m.dimension}`);
  if (cur.unit !== m.unit)           issues.push(`METRIC ❌ "${m.key}" unit=${cur.unit} != ${m.unit}`);
  const isDerived = !!cur.isDerived;
  if (isDerived !== m.derived) {
    issues.push(`METRIC ❌ "${m.key}" isDerived=${isDerived} != ${m.derived}`);
  }
}

// 6) Быстрая статическая проверка конвертера
//    Ищем коэффициенты km/h->m/s, m/s->km/h, %->ratio в тексте, и обратимость для ratio->%
function mustContain(snippet:string, human:string) {
  if (!codeUnits.includes(snippet)) issues.push(`UNITS ❌ отсутствует правило: ${human}`);
  else ok.push(`UNITS ✅ есть правило: ${human}`);
}
mustContain("km/h->m/s", "km/h -> m/s");
mustContain("m/s->km/h", "m/s -> km/h");
mustContain("%->ratio", "% -> ratio");
// для обратного направления ratio->% часто используется обратный коэффициент (деление на 0.01)
// Проверим наличие явной ветки либо деления на 0.01, либо метки "ratio->%"
if (!(codeUnits.includes("ratio->%") || codeUnits.match(/\/\s*0\.01|\*\s*100/))) {
  issues.push(`UNITS ❌ не найдено явной обратной конвертации ratio -> % (ожидаем деление на 0.01 или пометку 'ratio->%')`);
} else {
  ok.push("UNITS ✅ ratio -> % реализовано (обратный коэффициент)");
}

// 7) Проверка производных формул (минимально — присутствие ключей формулы)
function checkFormula(metricKey:string, pattern:RegExp, human:string) {
  const cur = findMetric(metricKey);
  if (!cur || !cur.isDerived) { issues.push(`FORMULA ❌ "${metricKey}" не помечена как derived`); return; }
  const f = (cur as any).formula_expr || "";
  if (!pattern.test(f)) issues.push(`FORMULA ❌ "${metricKey}" formula_expr не соответствует ожиданию (${human})`);
  else ok.push(`FORMULA ✅ "${metricKey}" ${human}`);
}
checkFormula("minutes_played",    /duration_s\s*\/\s*60/i, "duration_s/60");
checkFormula("max_speed_kmh",     /max_speed_ms\s*\*\s*3\.6/i, "max_speed_ms*3.6");
checkFormula("distance_per_min_m", /total_distance_m\s*\/\s*\(\s*duration_s\s*\/\s*60\s*\)/i, "total_distance_m/(duration_s/60)");

// 8) Проверка UI-пути отображения (snapshot-driven + fromCanonical)
//    Минимально: GpsReportTable должен вызывать fromCanonical(...) и не делать второго умножения на 100
const TABLE_PATH = path.resolve("src/components/gps/GpsReportTable.tsx");
let tableOk = false;
if (fs.existsSync(TABLE_PATH)) {
  const tableCode = fs.readFileSync(TABLE_PATH, "utf8");
  const usesFromCanonical = /fromCanonical\s*\(/.test(tableCode);
  const doublePercent = /%\s*\)\s*\*\s*100|value\s*\*\s*100/.test(tableCode);
  if (!usesFromCanonical) issues.push(`UI ❌ В таблице не найден вызов fromCanonical(...)`);
  if (doublePercent) issues.push(`UI ❌ Обнаружено повторное умножение на 100 для процентов`);
  if (usesFromCanonical && !doublePercent) { ok.push("UI ✅ fromCanonical используется, повторного умножения на 100 нет"); tableOk = true; }
} else {
  issues.push(`UI ⚠️ Не найден ${TABLE_PATH} для статической проверки`);
}

// 9) Итоговый отчёт
const lines:string[] = [];
lines.push("# CANON AUDIT — Read-only отчёт");
lines.push("");
lines.push("## Сводка");
lines.push(`- Метрики проверено: ${EXPECT.metrics.length}`);
lines.push(`- Измерения проверено: ${Object.keys(EXPECT.dimensions).length}`);
lines.push(`- Конвертер: проверены ключевые правила (km/h↔m/s, %↔ratio)`);
lines.push(`- UI: ${tableOk ? "fromCanonical найден, повторного % нет" : "требуется ручная проверка"}`);
lines.push("");
if (issues.length === 0) {
  lines.push("### ✅ Итог: расхождений не обнаружено (по проверяемым правилам).");
} else {
  lines.push(`### ❌ Итог: найдено расхождений: ${issues.length}`);
}
lines.push("");
if (ok.length) {
  lines.push("## PASS детали");
  lines.push(...ok.map(s=>"- "+s));
  lines.push("");
}
if (issues.length) {
  lines.push("## FAIL детали");
  lines.push(...issues.map(s=>"- "+s));
  lines.push("");
  lines.push("## Рекомендации по исправлению");
  lines.push("- Убедиться, что единицы для speed/ratio/time/distance соответствуют эталону (см. metrics.registry.json).");
  lines.push("- Для процентов: хранить как ratio в каноне, а в UI показывать '%' через fromCanonical без повторного *100.");
  lines.push("- Для скорости: хранить m/s, показывать km/h при выборе метрики *_kmh или displayUnit='km/h'.");
  lines.push("- Проверить наличие formula_expr у производных и соответствие формулам.");
}
fs.writeFileSync(path.resolve("artifacts/CANON_AUDIT.md"), lines.join("\n"), "utf8");
console.log("=== CANON_AUDIT SUMMARY ===");
console.log(issues.length ? `FAILURES: ${issues.length}` : "ALL GOOD");
