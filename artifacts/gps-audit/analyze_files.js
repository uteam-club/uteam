import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Список GPS-связанных файлов
const gpsFiles = [
  // API Routes
  'src/app/api/canonical/metrics/route.ts',
  'src/app/api/clean-gps-data/route.ts',
  'src/app/api/debug/gps-reports/[id]/route.ts',
  'src/app/api/gps-profiles/__tests__/profiles.canonical.test.ts',
  'src/app/api/gps-profiles/[id]/route.ts',
  'src/app/api/gps-profiles/[id]/usage/route.ts',
  'src/app/api/gps-profiles/parse-excel/route.ts',
  'src/app/api/gps-profiles/route.ts',
  'src/app/api/gps-profiles/templates/route.ts',
  'src/app/api/gps-reports/[id]/process/route.ts',
  'src/app/api/gps-reports/[id]/route.ts',
  'src/app/api/gps-reports/debug/route.ts',
  'src/app/api/gps-reports/diag/route.ts',
  'src/app/api/gps-reports/extract-players/route.ts',
  'src/app/api/gps-reports/fix-canonical/route.ts',
  'src/app/api/gps-reports/recalculate/route.ts',
  'src/app/api/gps-reports/route-old.ts',
  'src/app/api/gps-reports/route.ts',
  'src/app/api/public/gps-reports/[token]/route.ts',
  
  // Pages
  'src/app/clean-gps/page.tsx',
  'src/app/dashboard/fitness/gps-reports/page.tsx',
  'src/app/debug-gps/page.tsx',
  'src/app/dev/gps-report/[id]/page.tsx',
  'src/app/public/gps-report/[token]/page.tsx',
  
  // Canon
  'src/canon/__tests__/displayUnits.test.ts',
  'src/canon/__tests__/registry.v101.test.ts',
  'src/canon/__tests__/suggest.test.ts',
  'src/canon/__tests__/units.conversion.test.ts',
  'src/canon/__tests__/units.test.ts',
  'src/canon/displayUnits.ts',
  'src/canon/index.ts',
  'src/canon/metrics.registry.ts',
  'src/canon/suggest.ts',
  'src/canon/types.ts',
  'src/canon/units.ts',
  
  // Components
  'src/components/gps/__tests__/GpsReportTable.units.test.ts',
  'src/components/gps/CanonicalMetricSelector.tsx',
  'src/components/gps/CreateGpsProfileModal.tsx',
  'src/components/gps/EditGpsProfileModal.tsx',
  'src/components/gps/GpsProfilesTab.tsx',
  'src/components/gps/GpsReportModal.tsx',
  'src/components/gps/GpsReportsTab.tsx',
  'src/components/gps/GpsReportTable.tsx',
  'src/components/gps/GpsReportVisualization.tsx',
  'src/components/gps/GpsVisualization.tsx',
  'src/components/gps/PlayerMappingModal.tsx',
  'src/components/gps/PlayerMappingsTab.tsx',
  'src/components/gps/PlayerTiles.tsx',
  'src/components/gps/RecalcCanonicalModal.tsx',
  'src/components/gps/SimpleCreateGpsProfileModal.tsx',
  'src/components/gps/UploadGpsReportModal.tsx',
  
  // Database Schema
  'src/db/schema/gpsMetric.ts',
  'src/db/schema/gpsProfile.ts',
  'src/db/schema/gpsReport.ts',
  
  // Services
  'src/services/__tests__/canon.mapper.test.ts',
  'src/services/canon.mapper.new.ts',
  'src/services/canon.mapper.old.ts',
  'src/services/canon.mapper.ts',
  'src/services/gps.debug.ts',
  'src/services/gps.service.ts',
  'src/services/gps/__tests__/bsight-integration.test.ts',
  'src/services/gps/__tests__/dataFilter.service.test.ts',
  'src/services/gps/__tests__/ingest-sanitization.test.ts',
  'src/services/gps/__tests__/ingest.fixtures.e2e.test.ts',
  'src/services/gps/__tests__/ingest.service.test.ts',
  'src/services/gps/__tests__/normalizeRowsForMapping.improved.test.ts',
  'src/services/gps/__tests__/normalizeRowsForMapping.test.ts',
  'src/services/gps/__tests__/profileSnapshot.service.test.ts',
  'src/services/gps/dataFilter.service.ts',
  'src/services/gps/ingest.service.ts',
  'src/services/gps/normalizeRowsForMapping.ts',
  'src/services/gps/profileSnapshot.service.ts',
  'src/services/gps/sanitizers/__tests__/rowSanitizer.test.ts',
  'src/services/gps/sanitizers/rowSanitizer.ts',
  'src/services/gps/validators/__tests__/nameColumn.validator.test.ts',
  'src/services/gps/validators/nameColumn.validator.ts',
  
  // Types & Validators
  'src/types/gps.ts',
  'src/validators/gpsProfile.schema.ts',
  'src/validators/gpsUpload.schema.ts',
  
  // Scripts
  'scripts/audit/canon-audit.ts',
  'scripts/canon/audit-canon-dynamic.ts',
  'scripts/canon/audit-canon.ts',
  'scripts/canon/scan-deprecated-usage.ts',
  'scripts/canon/sync-v101.ts',
  'scripts/check-gps-data.cjs',
  'scripts/check-gps-data.js',
  'scripts/check-gps-db.cjs',
  'scripts/check-gps-reports.cjs',
  'scripts/check-matches-gps.cjs',
  'scripts/checks/gps-readiness.ci.cjs',
  'scripts/clean-gps-reports.cjs',
  'scripts/fix-gps-reports.js',
  'scripts/gps-diagnose-detailed.cjs',
  'scripts/gps-diagnose.cjs',
  'scripts/gps-fix-canonical.cjs',
  'scripts/gps-recalculate-direct.cjs',
  'scripts/gps-recalculate.cjs',
  'scripts/gps/audit-test-profile.ts',
  'scripts/gps/backfill-empty-snapshot-columns.ts',
  'scripts/gps/backfill-profile-snapshots.ts',
  'scripts/gps/backfill-sanitize-report.ts',
  'scripts/gps/debug-test-data.ts',
  'scripts/gps/diagnose-test-report.ts',
  'scripts/gps/dryrun-backfill-snapshot.ts',
  'scripts/gps/dryrun-prune.ts',
  'scripts/gps/dryrun-recover-snapshot.ts',
  'scripts/gps/export-gps-metadata.ts',
  'scripts/gps/import-demo.ts',
  'scripts/gps/inspect-report.ts',
  'scripts/gps/prune-empty-reports.ts',
  'scripts/gps/readiness-check.ts',
  'scripts/gps/readonly-audit-test-fixed.ts',
  'scripts/gps/readonly-audit-test.ts',
  'scripts/gps/seed-demo.ts',
  'scripts/gps/selftest-upload.cjs',
  'scripts/gps/simple-audit-test.ts',
  'scripts/gps/test-debug-api.cjs',
  'scripts/gps/test-debug-upload.cjs',
  'scripts/gps/verify-demo.ts',
  'scripts/gps/verify-fix-results.ts',
  'scripts/gps/verify-wipe.ts',
  'scripts/gps/wipe-gps.ts',
  'scripts/reprocess-gps-report.cjs'
];

function classifyFile(filePath) {
  if (filePath.includes('/api/')) return 'api-route';
  if (filePath.includes('/components/')) return 'ui-component';
  if (filePath.includes('/services/')) return 'service';
  if (filePath.includes('/validators/')) return 'validator';
  if (filePath.includes('/types/')) return 'types';
  if (filePath.includes('/canon/')) return 'canon';
  if (filePath.includes('/db/schema/')) return 'db';
  if (filePath.includes('/__tests__/') || filePath.includes('.test.')) return 'test';
  if (filePath.includes('/scripts/')) return 'script';
  if (filePath.includes('/page.tsx')) return 'page';
  return 'misc';
}

function extractExports(content) {
  const exports = [];
  
  // Named exports
  const namedExports = content.match(/export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g);
  if (namedExports) {
    exports.push(...namedExports.map(match => match.replace(/export\s+(?:const|let|var|function|class|interface|type|enum)\s+/, '')));
  }
  
  // Default exports
  const defaultExports = content.match(/export\s+default\s+(\w+)/g);
  if (defaultExports) {
    exports.push(...defaultExports.map(match => match.replace(/export\s+default\s+/, '')));
  }
  
  // Export statements
  const exportStatements = content.match(/export\s*{\s*([^}]+)\s*}/g);
  if (exportStatements) {
    exportStatements.forEach(statement => {
      const items = statement.match(/(\w+)/g);
      if (items) {
        exports.push(...items.slice(1)); // Skip 'export'
      }
    });
  }
  
  return [...new Set(exports)]; // Remove duplicates
}

function extractImports(content) {
  const imports = [];
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

function analyzeFile(filePath) {
  try {
    const fullPath = path.join('/Users/artem/Desktop/uteam-multi', filePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    const stats = fs.statSync(fullPath);
    
    return {
      path: filePath,
      kind: classifyFile(filePath),
      exports: extractExports(content),
      imports: extractImports(content),
      size: stats.size,
      reason: filePath.includes('gps') || filePath.includes('canon') ? 'gps-module' : 'canon-module'
    };
  } catch (error) {
    return {
      path: filePath,
      kind: classifyFile(filePath),
      exports: [],
      imports: [],
      size: 0,
      error: error.message,
      reason: 'gps-module'
    };
  }
}

const inventory = gpsFiles.map(analyzeFile);

fs.writeFileSync('/Users/artem/Desktop/uteam-multi/artifacts/gps-audit/INVENTORY.json', JSON.stringify(inventory, null, 2));

console.log(`Analyzed ${inventory.length} GPS-related files`);
console.log(`Files with errors: ${inventory.filter(f => f.error).length}`);
