#!/usr/bin/env bash
set -euo pipefail

# ---------- Настройка (можно переопределять через ENV) ----------
: "${PGDATABASE:=}"
: "${PGHOST:=}"
: "${PGPORT:=5432}"
: "${PGUSER:=}"
# PGPASSWORD берётся из ENV, если нужен

: "${REPORTS_TABLE:=gps_reports}"
: "${COL_PROFILE_SNAPSHOT:=profileSnapshot}"
: "${COL_CANON_VERSION:=canonVersion}"
: "${COL_IMPORT_META:=importMeta}"
: "${COL_PROFILE_ID:=profileId}"
: "${DEMO_REPORT_HINT:=demo}"  # подсказка для демо-отчётов

ART_DIR="artifacts"
SUMMARY_MD="$ART_DIR/GPS_READINESS_SUMMARY.md"
SUMMARY_JSON="$ART_DIR/GPS_READINESS_SUMMARY.json"
mkdir -p "$ART_DIR"

pass() { printf "✅ %s\n" "$1"; }
fail() { printf "❌ %s\n" "$1"; }
skip() { printf "⏭️  %s\n" "$1"; }

has_psql=0
if command -v psql >/dev/null 2>&1 && [[ -n "${PGDATABASE}" ]]; then
  has_psql=1
fi

# Сбор результатов (используем простые переменные вместо ассоциативного массива)
R_a="SKIP"
R_b="SKIP"
R_c="SKIP"
R_d="SKIP"
R_e="SKIP"
R_f="SKIP"
R_g="SKIP"
R_h="SKIP"
R_i="SKIP"

info_lines=""

section() { printf "\n\033[1m%s\033[0m\n" "$1"; }

# ---------- A-D: DB checks (read-only) ----------
section "DB checks"

if [[ $has_psql -eq 1 ]]; then
  # a) Required columns exist
  q_cols="
    SELECT COUNT(*) AS cnt
    FROM information_schema.columns
    WHERE table_name = LOWER('${REPORTS_TABLE}')
      AND column_name IN (LOWER('${COL_PROFILE_SNAPSHOT}'), LOWER('${COL_CANON_VERSION}'), LOWER('${COL_IMPORT_META}'));
  "
  cnt_cols=$(psql -XtAc "$q_cols" || echo 0)
  if [[ "$cnt_cols" == "3" ]]; then
    pass "a) Required columns exist: ${COL_PROFILE_SNAPSHOT}, ${COL_CANON_VERSION}, ${COL_IMPORT_META}"
    R_a="PASS"
  else
    fail "a) Required columns missing (found ${cnt_cols}/3)"
    R_a="FAIL"
  fi

  # b) ProfileId index exists
  q_idx="
    SELECT COUNT(*)
    FROM pg_indexes
    WHERE tablename = LOWER('${REPORTS_TABLE}')
      AND indexdef ILIKE '%(${COL_PROFILE_ID}%';
  "
  cnt_idx=$(psql -XtAc "$q_idx" || echo 0)
  if [[ "$cnt_idx" != "0" ]]; then
    pass "b) ProfileId index exists (${cnt_idx} index(es))"
    R_b="PASS"
  else
    fail "b) No index on ${COL_PROFILE_ID} in ${REPORTS_TABLE}"
    R_b="FAIL"
  fi

  # c) Reports with non-empty snapshot columns
  q_snap="
    SELECT COUNT(*) FROM ${REPORTS_TABLE}
    WHERE ${COL_PROFILE_SNAPSHOT} IS NOT NULL
      AND ${COL_CANON_VERSION} IS NOT NULL
      AND ${COL_IMPORT_META} IS NOT NULL;
  "
  c_with_snap=$(psql -XtAc "$q_snap" || echo 0)
  if [[ "$c_with_snap" -gt 0 ]]; then
    pass "c) Reports with snapshot columns present: ${c_with_snap}"
    R_c="PASS"
  else
    fail "c) No reports with snapshot columns present"
    R_c="FAIL"
  fi

  # d) Demo rows == 5 — зависит от схемы хранения строк; по умолчанию SKIP
  skip "d) Demo rows == 5 — SKIP (требуется конкретная схема rows)"
  R_d="SKIP"
else
  skip "a–d) DB checks skipped (psql недоступен или не заданы PG* переменные)"
  R_a="SKIP"; R_b="SKIP"; R_c="SKIP"; R_d="SKIP"
fi

# ---------- E-G: Code hygiene ----------
section "Code hygiene"

# e) No vendor conditions in runtime (исключаем API и templates)
vendor_hits=$(grep -RIn \
  --include='*.ts' --include='*.tsx' \
  -E 'gpsSystem|Catapult|STATSports|Vendor' src \
  --exclude-dir=src/app/api \
  --exclude-dir=src/app/templates \
  2>/dev/null || true)

if [[ -z "$vendor_hits" ]]; then
  pass "e) No vendor conditions in runtime code"
  R_e="PASS"
else
  fail "e) Vendor conditions found in runtime:"
  echo "$vendor_hits" | sed 's/^/   • /'
  R_e="FAIL"
fi

# f) No magic indices in GPS pipeline (эвристика)
magic_idx=$(grep -RIn \
  --include='*.ts' --include='*.tsx' \
  -E 'rows\[[0-9]+\]|data\[[0-9]+\]' src/services src/components/gps \
  --exclude-dir='**/__tests__' 2>/dev/null || true)

if [[ -z "$magic_idx" ]]; then
  pass "f) No hardcoded row indices in GPS pipeline"
  R_f="PASS"
else
  fail "f) Hardcoded indices found:"
  echo "$magic_idx" | sed 's/^/   • /'
  R_f="FAIL"
fi

# g) Dev page protection — ищем страницы /dev и /internal и наличие notFound()
dev_pages=$(find src/app -type f -name 'page.tsx' \( -path '*/dev/*' -o -path '*/internal/*' \) 2>/dev/null || true)
dev_protected="PASS"
if [[ -n "$dev_pages" ]]; then
  while IFS= read -r p; do
    if [[ -n "$p" ]] && ! grep -q 'notFound\s*\(' "$p"; then
      dev_protected="FAIL"
      info_lines="${info_lines}Dev page without notFound(): $p\n"
    fi
  done <<< "$dev_pages"
fi
if [[ "${dev_protected}" == "PASS" ]]; then
  pass "g) Dev pages guarded by notFound() (or none found)"
  R_g="PASS"
else
  fail "g) Some dev pages are missing notFound()"
  R_g="FAIL"
fi

# ---------- H-I: Tests (опционально) ----------
section "Tests"

run_npm() {
  if command -v npm >/dev/null 2>&1; then
    npm run -s "$1" 2>&1 || return $?
  else
    return 127
  fi
}

# h) Unit tests
if npm pkg get scripts 2>/dev/null | grep -q '"test' ; then
  set +e
  test_out=$(run_npm test --silent)
  code=$?
  set -e
  if [[ $code -eq 0 ]]; then
    pass "h) Unit tests passed"
    R_h="PASS"
  else
    fail "h) Unit tests failing"
    info_lines="${info_lines}jest output:\n${test_out}\n"
    R_h="FAIL"
  fi
else
  skip "h) No test script in package.json"
  R_h="SKIP"
fi

# i) E2E tests (playwright/cypress)
if npm pkg get scripts 2>/dev/null | grep -q '"e2e' ; then
  set +e
  e2e_out=$(run_npm e2e --silent)
  code=$?
  set -e
  if [[ $code -eq 0 ]]; then
    pass "i) E2E tests passed"
    R_i="PASS"
  else
    fail "i) E2E tests failing"
    info_lines="${info_lines}e2e output:\n${e2e_out}\n"
    R_i="FAIL"
  fi
else
  skip "i) No e2e script in package.json"
  R_i="SKIP"
fi

# ---------- Итоги + артефакты ----------
overall="PASS"
for k in a b c d e f g h i; do
  v="R_$k"
  eval "v=\$$v"
  if [[ "$v" == "FAIL" ]]; then overall="FAIL"; fi
done

{
  echo "# GPS Readiness — Summary"
  echo
  echo "**Overall:** ${overall}"
  echo
  echo "## Results"
  echo "- a: $R_a"
  echo "- b: $R_b"
  echo "- c: $R_c"
  echo "- d: $R_d"
  echo "- e: $R_e"
  echo "- f: $R_f"
  echo "- g: $R_g"
  echo "- h: $R_h"
  echo "- i: $R_i"
  if [[ -n "$info_lines" ]]; then
    echo
    echo "## Notes"
    printf "%s" "$info_lines"
  fi
} > "$SUMMARY_MD"

{
  printf '{\n'
  printf '  "overall": "%s",\n' "$overall"
  printf '  "results": {\n'
  printf '    "a": "%s",\n' "$R_a"
  printf '    "b": "%s",\n' "$R_b"
  printf '    "c": "%s",\n' "$R_c"
  printf '    "d": "%s",\n' "$R_d"
  printf '    "e": "%s",\n' "$R_e"
  printf '    "f": "%s",\n' "$R_f"
  printf '    "g": "%s",\n' "$R_g"
  printf '    "h": "%s",\n' "$R_h"
  printf '    "i": "%s"\n' "$R_i"
  printf '  }\n'
  printf '}\n'
} > "$SUMMARY_JSON"

echo
echo "Artifacts:"
echo " - $SUMMARY_MD"
echo " - $SUMMARY_JSON"
