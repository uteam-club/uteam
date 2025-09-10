#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

echo "== [no-gps guard] scanning workspace =="
# Что считаем нарушением: любые пути/импорты/символы GPS-старого слоя
PATTERNS=(
  '/gps/'               # пути вида src/.../gps/...
  'from .*/gps/'        # импорты компонентов/сервисов gps
  '@\/components\/gps'  # алиасы на gps-компоненты
  '@\/app\/api\/gps'    # алиасы на gps-роуты
  '@\/services\/gps'    # алиасы на gps-сервисы
  '@\/canon'            # старый канон-реестр/единицы
  '\bGpsReport\b'
  '\bGpsProfile\b'
  '\bgps-reports\b'
  '\bgps-profiles\b'
)

# Исключаем шум
EXCLUDES=(
  'node_modules'
  '.git'
  '.next'
  'dist'
  'build'
  'legacy'
  'artifacts'
  'drizzle'       # миграции допускаем
  'scripts/db'    # скрипты миграции БД
  'docs'
  '.github'
)

# Собираем флаги для grep
EX_ARGS=()
for ex in "${EXCLUDES[@]}"; do
  EX_ARGS+=( -not -path "*/$ex/*" )
done

FAIL=0
REPORT="artifacts/guards/no-gps-report.txt"
mkdir -p artifacts/guards
: > "$REPORT"

for pat in "${PATTERNS[@]}"; do
  # ищем по всем типам исходников
  MATCHES=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.md" \) "${EX_ARGS[@]}" -print0 \
    | xargs -0 grep -nE "$pat" || true)
  if [[ -n "$MATCHES" ]]; then
    FAIL=1
    echo "---- Pattern: $pat ----" | tee -a "$REPORT"
    echo "$MATCHES" | tee -a "$REPORT"
    echo >> "$REPORT"
  fi
done

if [[ $FAIL -ne 0 ]]; then
  echo
  echo "❌ [no-gps guard] найдено упоминание GPS. См. $REPORT"
  exit 2
else
  echo "✅ [no-gps guard] нарушений не найдено."
fi
