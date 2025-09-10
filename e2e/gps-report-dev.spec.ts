import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';

// Парсим ID отчётов из artifacts/seed-demo.ids.json или fallback из verify-demo.txt
function getReportIds(): { polarId: string; statsportsId: string } {
  // Сначала пробуем seed-demo.ids.json
  try {
    const seedData = JSON.parse(readFileSync('artifacts/seed-demo.ids.json', 'utf8'));
    if (seedData.polarReportId && seedData.statsportsReportId) {
      return { 
        polarId: seedData.polarReportId, 
        statsportsId: seedData.statsportsReportId 
      };
    }
  } catch (error) {
    console.log('Could not read seed-demo.ids.json, falling back to verify-demo.txt');
  }

  // Fallback к verify-demo.txt
  const verifyContent = readFileSync('artifacts/verify-demo.txt', 'utf8');
  const lines = verifyContent.split('\n');
  
  let polarId = '';
  let statsportsId = '';
  
  for (const line of lines) {
    if (line.includes('Polar Demo Report: http://localhost:3000/dev/gps-report/')) {
      polarId = line.split('/dev/gps-report/')[1];
    }
    if (line.includes('STATSports Demo Report: http://localhost:3000/dev/gps-report/')) {
      statsportsId = line.split('/dev/gps-report/')[1];
    }
  }
  
  if (!polarId || !statsportsId) {
    throw new Error('Could not find report IDs in seed-demo.ids.json or verify-demo.txt');
  }
  
  return { polarId, statsportsId };
}

test.describe('GPS Report Dev Viewer', () => {
  let reportIds: { polarId: string; statsportsId: string };

  test.beforeAll(async () => {
    reportIds = getReportIds();
  });

  test('Polar report should render correctly with snapshot data', async ({ page }) => {
    await page.goto(`/dev/gps-report/${reportIds.polarId}`);
    
    // Проверяем, что страница загрузилась
    await expect(page.locator('h1')).toContainText('Polar Demo Report');
    
    // Проверяем заголовки таблицы (должны быть в порядке из snapshot)
    const tableHeaders = page.locator('thead th');
    await expect(tableHeaders).toHaveCount(4);
    
    // Проверяем конкретные заголовки в правильном порядке (из Polar профиля)
    await expect(tableHeaders.nth(0)).toHaveText('Игрок');
    await expect(tableHeaders.nth(1)).toHaveText('TD');
    await expect(tableHeaders.nth(2)).toHaveText('Vmax');
    await expect(tableHeaders.nth(3)).toHaveText('Мин');
    
    // Проверяем, что ровно 5 строк данных
    const dataRows = page.locator('tbody tr');
    await expect(dataRows).toHaveCount(5);
    
    // Проверяем, что первая строка содержит данные (первая колонка может быть пустой)
    const firstRow = dataRows.first();
    // Проверяем, что есть числовые данные во второй колонке (TD)
    await expect(firstRow.locator('td').nth(1)).toContainText('5200');
    
    // Делаем скриншот
    await page.screenshot({ 
      path: 'artifacts/screens/polar-report.png',
      fullPage: true 
    });
  });

  test('STATSports report should render correctly with snapshot data', async ({ page }) => {
    await page.goto(`/dev/gps-report/${reportIds.statsportsId}`);
    
    // Проверяем, что страница загрузилась
    await expect(page.locator('h1')).toContainText('STATSports Demo Report');
    
    // Проверяем заголовки таблицы (должны быть в порядке из snapshot)
    const tableHeaders = page.locator('thead th');
    await expect(tableHeaders).toHaveCount(4);
    
    // Проверяем конкретные заголовки в правильном порядке (из STATSports профиля)
    await expect(tableHeaders.nth(0)).toHaveText('Игрок');
    await expect(tableHeaders.nth(1)).toHaveText('Дистанция');
    await expect(tableHeaders.nth(2)).toHaveText('Vmax');
    await expect(tableHeaders.nth(3)).toHaveText('Сек');
    
    // Проверяем, что ровно 5 строк данных
    const dataRows = page.locator('tbody tr');
    await expect(dataRows).toHaveCount(5);
    
    // Проверяем, что первая строка содержит данные (вторая колонка может быть пустой)
    const firstRow = dataRows.first();
    // Проверяем, что есть числовые данные в третьей колонке (Vmax)
    await expect(firstRow.locator('td').nth(2)).toContainText('7.89');
    
    // Делаем скриншот
    await page.screenshot({ 
      path: 'artifacts/screens/statsports-report.png',
      fullPage: true 
    });
  });

  test('Dev page should be protected from production access', async ({ page }) => {
    // Тест проверяет, что с query-параметром ?prod=1 страница возвращает 404
    await page.goto(`/dev/gps-report/${reportIds.polarId}?prod=1`);
    
    // Должна быть 404 страница
    await expect(page.locator('h1')).toContainText('404');
  });
});
