import fs from 'fs';
import path from 'path';

const SRC = path.resolve(process.cwd(), 'src/components/gps/EditGpsProfileModal.tsx');

function read() {
  return fs.readFileSync(SRC, 'utf8');
}

describe('EditGpsProfileModal – static guard checks', () => {
  let code: string;

  beforeAll(() => {
    code = read();
  });

  test('используется единый ключ getRowKey(canonicalKey + mappedColumn)', () => {
    // getRowKey определён и использует mappedColumn
    expect(code).toMatch(/const\s+getRowKey\s*=\s*\(\s*c\s*:\s*\{[^}]*canonicalKey[^}]*mappedColumn[^}]*\}\)\s*=>/);
    expect(code).toMatch(/getRowKey\([^)]*\)/);
    expect(code).toMatch(/canonicalKey[\s\S]*__@@__[\s\S]*mappedColumn/i);

    // снимок oldKeys строится через getRowKey(...), а не через sourceHeader
    expect(code).not.toMatch(/sourceHeader\s*\+\s*/i);
    expect(code).not.toMatch(/canonicalKey[^;\n]*\+\s*sourceHeader/i);

    // rowKey при рендере — через getRowKey(column)
    expect(code).toMatch(/const\s+rowKey\s*=\s*getRowKey\(column\)/);
  });

  test('disabled/guard для заблокированных строк присутствуют', () => {
    // disable у кнопки выбора канон-метрики
    expect(code).toMatch(/disabled=\{isRowLocked\}/);

    // guard для onClick выбора метрики
    expect(code).toMatch(/onClick=\{\s*\(?\s*.*=>\s*(?:!isRowLocked\s*&&|if\s*\(!isRowLocked\))/);

    // disable у кнопки удаления
    const hasDeleteDisabled = /disabled[\s\S]*className=["'][^"']*cursor-not-allowed/.test(code);
    expect(hasDeleteDisabled).toBe(true);
  });

  test('автоподсказка suggestCanonical не срабатывает для заблокированных строк', () => {
    // должен быть guard вида: if (isLocked) { ... oldKeys.current.has(getRowKey(...)) ... return; }
    const guard1 = /if\s*\(\s*isLocked\s*\)\s*\{[\s\S]*oldKeys\.current\.has\([\s\S]*getRowKey\(/.test(code);
    expect(guard1).toBe(true);

    // и при onDisplayNameChange: !isRowLocked && !col.canonicalKey → suggestCanonical(...)
    const guardedSuggest = /if\s*\(\s*!\s*column\.canonicalKey\s*&&\s*!\s*isRowLocked\s*\)\s*\{/.test(code);
    expect(guardedSuggest).toBe(true);
  });

  test('в payload на сервер уходит поле name (не только displayName)', () => {
    // проверяем, что при формировании body.columns есть свойство name:
    // ... name: <что-то из displayName/col.name> ...
    const hasNameMapping = /name\s*:\s*(column\.displayName|column\.name|col\.displayName|col\.name)/.test(code)
      || /name\s*:\s*.*displayName/.test(code);
    expect(hasNameMapping).toBe(true);
  });
});
