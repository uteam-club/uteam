#!/usr/bin/env node

/**
 * GPS Readiness Check (CI Mode)
 * 
 * Code-only checks without database dependencies.
 * Validates GPS module structure and code quality.
 */

const fs = require('fs');
const path = require('path');

// Ensure artifacts directory exists
const artifactsDir = path.join(process.cwd(), 'artifacts');
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

const checks = {
  canonFiles: false,
  noVendorCode: false,
  noMagicIndices: false,
  snapshotService: false,
  devViewer: false,
  e2eArtifacts: false
};

const warnings = [];
const errors = [];

console.log('🔍 GPS Readiness Check (CI Mode)');
console.log('================================');

// Check 1: Canon files exist
console.log('📁 Checking canonical files...');
const canonFiles = [
  'src/canon/metrics.registry.json',
  'src/canon/units.ts',
  'src/canon/types.ts'
];

let canonFilesExist = true;
for (const file of canonFiles) {
  if (!fs.existsSync(file)) {
    canonFilesExist = false;
    errors.push(`Missing canonical file: ${file}`);
  }
}
checks.canonFiles = canonFilesExist;
console.log(canonFilesExist ? '✅ Canon files present' : '❌ Canon files missing');

// Check 2: No vendor-specific code in runtime
console.log('🔍 Checking for vendor-specific code...');
const gpsFiles = [
  'src/services/gps/ingest.service.ts',
  'src/services/gps/profileSnapshot.service.ts',
  'src/components/gps/GpsVisualization.tsx'
];

let hasVendorCode = false;
for (const file of gpsFiles) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    // Look for vendor-specific conditions (excluding comments and templates)
    const vendorPatterns = [
      /if\s*\(\s*gpsSystem\s*===/g,
      /if\s*\(\s*system\s*===/g,
      /switch\s*\(\s*gpsSystem\s*\)/g
    ];
    
    for (const pattern of vendorPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        // Check if it's in a comment or template
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i]) && !lines[i].trim().startsWith('//') && !lines[i].trim().startsWith('*')) {
            hasVendorCode = true;
            errors.push(`Vendor-specific code found in ${file}:${i + 1}`);
            break;
          }
        }
      }
    }
  }
}
checks.noVendorCode = !hasVendorCode;
console.log(!hasVendorCode ? '✅ No vendor-specific code found' : '❌ Vendor-specific code detected');

// Check 3: No magic array indices
console.log('🔍 Checking for magic array indices...');
let hasMagicIndices = false;
for (const file of gpsFiles) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    // Look for array access with hardcoded indices (excluding comments, templates, and legitimate cases)
    const magicPattern = /\[\s*\d+\s*\]/g;
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (magicPattern.test(lines[i]) && !lines[i].trim().startsWith('//') && !lines[i].trim().startsWith('*')) {
        // Allow legitimate cases like SheetNames[0], headers[0], etc.
        const line = lines[i];
        if (line.includes('SheetNames[0]') || 
            line.includes('headers[0]') || 
            line.includes('rows[0]') ||
            line.includes('columns[0]') ||
            line.includes('data[0]') ||
            line.includes('jsonData[0]') ||
            line.includes('jsonData.slice(1)')) {
          continue;
        }
        hasMagicIndices = true;
        errors.push(`Magic array index found in ${file}:${i + 1}`);
        break;
      }
    }
  }
}
checks.noMagicIndices = !hasMagicIndices;
console.log(!hasMagicIndices ? '✅ No magic array indices found' : '❌ Magic array indices detected');

// Check 4: buildProfileSnapshot service exists
console.log('🔍 Checking buildProfileSnapshot service...');
const snapshotServiceFile = 'src/services/gps/profileSnapshot.service.ts';
if (fs.existsSync(snapshotServiceFile)) {
  const content = fs.readFileSync(snapshotServiceFile, 'utf8');
  checks.snapshotService = content.includes('buildProfileSnapshot');
}
console.log(checks.snapshotService ? '✅ buildProfileSnapshot service found' : '❌ buildProfileSnapshot service missing');

// Check 5: Dev viewer uses snapshot
console.log('🔍 Checking dev viewer snapshot usage...');
const devViewerFile = 'src/app/dev/gps-report/[id]/page.tsx';
if (fs.existsSync(devViewerFile)) {
  const content = fs.readFileSync(devViewerFile, 'utf8');
  checks.devViewer = content.includes('profileSnapshot') && content.includes('columns');
}
console.log(checks.devViewer ? '✅ Dev viewer uses snapshot' : '❌ Dev viewer snapshot usage missing');

// Check 6: E2E artifacts (optional)
console.log('🔍 Checking E2E artifacts (optional)...');
const e2eArtifacts = [
  'e2e/gps-report-dev.spec.ts',
  'playwright.config.ts'
];
let e2eExists = true;
for (const artifact of e2eArtifacts) {
  if (!fs.existsSync(artifact)) {
    e2eExists = false;
    warnings.push(`E2E artifact missing: ${artifact}`);
  }
}
checks.e2eArtifacts = e2eExists;
console.log(e2eExists ? '✅ E2E artifacts present' : '⚠️ E2E artifacts missing (optional)');

// Generate summary
const passedChecks = Object.values(checks).filter(Boolean).length;
const totalChecks = Object.keys(checks).length;
const hasErrors = errors.length > 0;

console.log('\n📊 Summary:');
console.log(`Passed: ${passedChecks}/${totalChecks} checks`);

if (warnings.length > 0) {
  console.log('\n⚠️ Warnings:');
  warnings.forEach(warning => console.log(`  - ${warning}`));
}

if (hasErrors) {
  console.log('\n❌ Errors:');
  errors.forEach(error => console.log(`  - ${error}`));
}

// Generate artifacts
const summary = {
  status: hasErrors ? 'FAIL' : 'PASS',
  checks: checks,
  passed: passedChecks,
  total: totalChecks,
  warnings: warnings,
  errors: errors,
  timestamp: new Date().toISOString()
};

// Write JSON report
fs.writeFileSync(
  path.join(artifactsDir, 'GPS_READINESS_SUMMARY.json'),
  JSON.stringify(summary, null, 2)
);

// Write Markdown report
const mdReport = `# GPS Readiness Summary (CI Mode)

**Status**: ${hasErrors ? '❌ FAIL' : '✅ PASS'}

**Checks Passed**: ${passedChecks}/${totalChecks}

## Code-Only Checks

- **Canon Files**: ${checks.canonFiles ? '✅' : '❌'} Canonical files present
- **No Vendor Code**: ${checks.noVendorCode ? '✅' : '❌'} No vendor-specific conditions
- **No Magic Indices**: ${checks.noMagicIndices ? '✅' : '❌'} No magic array indices
- **Snapshot Service**: ${checks.snapshotService ? '✅' : '❌'} buildProfileSnapshot service
- **Dev Viewer**: ${checks.devViewer ? '✅' : '❌'} Dev viewer uses snapshot
- **E2E Artifacts**: ${checks.e2eArtifacts ? '✅' : '⚠️'} E2E artifacts present (optional)

${warnings.length > 0 ? `## Warnings\n${warnings.map(w => `- ${w}`).join('\n')}\n` : ''}
${hasErrors ? `## Errors\n${errors.map(e => `- ${e}`).join('\n')}\n` : ''}

**Generated**: ${new Date().toISOString()}
`;

fs.writeFileSync(
  path.join(artifactsDir, 'GPS_READINESS_SUMMARY.md'),
  mdReport
);

console.log(`\n📁 Reports saved to artifacts/GPS_READINESS_SUMMARY.*`);

// Exit with error code if there are errors
if (hasErrors) {
  console.log('\n❌ Readiness check failed');
  process.exit(1);
} else {
  console.log('\n✅ Readiness check passed');
  process.exit(0);
}
