// e2e/gps-units-display.spec.ts
import { test, expect } from '@playwright/test';

test.describe('GPS Units Display', () => {
  test('should display values in correct units on dev page', async ({ page }) => {
    // Navigate to dev GPS report page
    await page.goto('/dev/gps-report/c13c770e-eae7-4c4f-8954-2e859ae121d1');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="gps-report-table"]', { timeout: 10000 });
    
    // Check that the table is visible
    const table = page.locator('[data-testid="gps-report-table"]');
    await expect(table).toBeVisible();
    
    // Check that column headers show correct units
    const speedHeader = page.locator('th:has-text("Max speed")');
    await expect(speedHeader).toContainText('км/ч');
    
    const hsrHeader = page.locator('th:has-text("HSR")');
    await expect(hsrHeader).toContainText('%');
    
    // Check that values are formatted correctly
    const speedCells = page.locator('td:has-text("км/ч")');
    const speedValues = await speedCells.allTextContents();
    
    // Verify speed values are in km/h format (should be reasonable numbers like 20-30)
    for (const value of speedValues) {
      if (value && value !== '—') {
        const numericValue = parseFloat(value.replace(' км/ч', ''));
        expect(numericValue).toBeGreaterThan(0);
        expect(numericValue).toBeLessThan(100); // Reasonable max speed
      }
    }
    
    const hsrCells = page.locator('td:has-text("%")');
    const hsrValues = await hsrCells.allTextContents();
    
    // Verify HSR values are in percentage format
    for (const value of hsrValues) {
      if (value && value !== '—') {
        const numericValue = parseFloat(value.replace('%', ''));
        expect(numericValue).toBeGreaterThanOrEqual(0);
        expect(numericValue).toBeLessThanOrEqual(100);
      }
    }
    
    // Check that player names are displayed correctly
    const playerNames = page.locator('td:first-child');
    const names = await playerNames.allTextContents();
    
    // Should have at least one valid player name
    const validNames = names.filter(name => 
      name && 
      name !== '—' && 
      name.trim() !== '' && 
      !name.toLowerCase().includes('итог') &&
      !name.toLowerCase().includes('total')
    );
    
    expect(validNames.length).toBeGreaterThan(0);
  });
  
  test('should show filtered count when data is filtered', async ({ page }) => {
    await page.goto('/dev/gps-report/c13c770e-eae7-4c4f-8954-2e859ae121d1');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="gps-report-table"]', { timeout: 10000 });
    
    // Check if filtered count badge is visible
    const filteredBadge = page.locator('text=Отфильтровано');
    if (await filteredBadge.isVisible()) {
      const count = await filteredBadge.textContent();
      expect(count).toMatch(/Отфильтровано: \d+/);
    }
  });
  
  test('should display warnings when data has issues', async ({ page }) => {
    await page.goto('/dev/gps-report/c13c770e-eae7-4c4f-8954-2e859ae121d1');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="gps-report-table"]', { timeout: 10000 });
    
    // Check if warning badges are visible
    const warningBadges = page.locator('[class*="bg-yellow-100"]');
    const warningCount = await warningBadges.count();
    
    if (warningCount > 0) {
      // Verify warning text is meaningful
      for (let i = 0; i < warningCount; i++) {
        const warningText = await warningBadges.nth(i).textContent();
        expect(warningText).toBeTruthy();
        expect(warningText!.length).toBeGreaterThan(0);
      }
    }
  });
});
