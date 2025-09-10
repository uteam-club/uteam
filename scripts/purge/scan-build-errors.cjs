const fs = require('fs');
const p = 'artifacts/purge-quarantine/build-after-exclude.txt';
const txt = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
const paths = [...txt.matchAll(/(?:Error: |Module not found: .*|TS\d+: .*?)\s+([./\w-]+\.(?:ts|tsx|js|jsx))/g)]
  .map(m => m[1]).filter(Boolean);
const uniq = [...new Set(paths)];
fs.writeFileSync('artifacts/purge-quarantine/build-problem-files.txt', uniq.join('\n'));
console.log('Problem files:', uniq.length);
