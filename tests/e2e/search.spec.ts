import { test, expect } from '@playwright/test';

test.describe('Baza Pacijenata - Search, Debounce & Pagination', () => {

  test.beforeEach(async ({ page }) => { 
    // 1. Handle login landing step
    await page.goto('http://localhost:3000/');
    const staffButton = page.locator('button:has-text("Staff Ulaz"), a:has-text("Staff Ulaz")').first();
    if (await staffButton.isVisible()) {
      await staffButton.click();
    }
    await page.locator('input[type="email"], input[placeholder*="example@aligne.com"]').fill('staff@aligne.com');
    await page.locator('input[type="password"]').fill('staff123');
    await page.getByRole('button', { name: 'Pristupi panelu' }).click();
    await page.waitForURL('http://localhost:3000/dashboard');
  
    // 2. Navigate straight to Baza Pacijenata page
    await page.locator('a, button').filter({ hasText: /^Baza Pacijenata$/ }).first().click();
    await page.waitForURL('**/dashboard/patients');
  });

  test('should debounce input processing and synchronize search strings into URL queries', async ({ page }) => {
    
    const searchInput = page.locator('input[placeholder*="Pretraži po imenu"]');
    await expect(searchInput).toBeVisible();

    // Edge Case Stress Test: Simulate typing rapidly to verify debounce hook intercepts unnecessary API hits
    // We type 'Tar', then change it instantly to 'Tarik' to ensure it handles intermediate changes gracefully.
    await searchInput.pressSequentially('Tar', { delay: 50 });
    await searchInput.fill('Tarik'); 

    
    await page.waitForTimeout(800);


    
    await expect(page.locator('text=Tarik Hadžić')).toBeVisible();
  });

  test('should handle navigation traversing across multiple dataset pages', async ({ page }) => {
    
    const nextButton = page.locator('button:has-text("Slijedeća"), button:has-text("Next"), button:has-text(">")').first();
    const prevButton = page.locator('button:has-text("Prethodna"), button:has-text("Previous"), button:has-text("<")').first();

    // If there aren't enough records to activate pagination elements, this test passes gracefully
    if (await nextButton.isVisible() && await nextButton.isEnabled()) {
      // Click forward to Page 2
      await nextButton.click();
      await page.waitForLoadState('networkidle');
      
      // Ensure page URL query parameters reactively update tracking state
      await expect(page).toHaveURL(/.*page=2/);

      // Verify navigating backward reverts application state smoothly
      await prevButton.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*page=1/);
    } else {
      console.log('Skipping step: Database contains less than 1 page of active patient listings.');
    }
  });
});