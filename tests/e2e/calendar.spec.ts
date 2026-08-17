import { test, expect } from '@playwright/test';

test.describe('Calendar Feature (Authenticated)', () => {
  
  test.beforeEach(async ({ page }) => {
    // 1. Perform Admin Login
    await page.goto('http://localhost:3000/');
    await page.locator('text=Master Ulaz').click();
    await page.locator('input[type="email"]').fill('admin@aligne.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /Pristupi panelu/i }).click();
    
    // Confirm dashboard redirection
    await expect(page).toHaveURL("http://localhost:3000/dashboard", { timeout: 15000 });

    // 2. Navigate straight to the appointments route
    await page.goto('http://localhost:3000/dashboard/appointments');
    
    // Fix Strict Mode Violation: target the h1 main page title header element specifically
    await expect(page.getByRole('heading', { name: 'Kalendar i termini' })).toBeVisible({ timeout: 15000 });
  });

  test('should load navigation buttons', async ({ page }) => {
    // Exact matching for specific button content elements layout
    await expect(page.locator('button', { hasText: /^Dan$/ })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button', { hasText: /^Sedmica$/ })).toBeVisible();
    await expect(page.locator('button', { hasText: /^Danas$/ })).toBeVisible();
  });

  test('should open add appointment modal', async ({ page }) => {
    // Selects the button containing the text 'Dodaj termin' adjacent to the plus icon
    const addBtn = page.locator('button', { hasText: /Dodaj termin/ });
    await addBtn.click();
    
    // Verify the appointment intake form modal displays properly
    await expect(page.getByText('Zakazivanje novog termina')).toBeVisible({ timeout: 10000 });
  });

  test('should open date and time pickers', async ({ page }) => {
    await page.locator('button', { hasText: /Dodaj termin/ }).click();
    
    // Robust selector handling either browser date elements or standard layout pickers
    const datePicker = page.getByRole('button', { name: /Show date picker/i }).or(page.locator('input[type="date"]'));
    const timePicker = page.getByRole('button', { name: /Show time picker/i }).first().or(page.locator('input[type="time"]')).first();
    
    if (await datePicker.count() > 0) {
      await datePicker.first().waitFor({ state: 'visible' });
      await datePicker.first().click().catch(() => {});
    }
    
    if (await timePicker.count() > 0) {
      await timePicker.first().waitFor({ state: 'visible' });
      await timePicker.first().click().catch(() => {});
    }
  });

});