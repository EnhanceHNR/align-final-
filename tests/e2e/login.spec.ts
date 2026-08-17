import { test, expect } from '@playwright/test';

test.describe('Aligne Login Flow', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/');
  });

  test('Successful Login as Master, Cookie Verification, and Logout', async ({ page }) => {
    
    await page.locator('text=Master Ulaz').click();

    
    await page.locator('input[type="email"]').fill('admin@aligne.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /Pristupi panelu/i }).click();

    
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

    
    const cookies = await page.context().cookies();
    const tokenCookie = cookies.find(c => c.name === 'aligne_token');
    expect(tokenCookie).toBeTruthy();
    expect(tokenCookie?.httpOnly).toBe(true);

    
    const logoutButton = page.locator('text=Odjava').or(page.locator('text=Logout'));
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await expect(page).toHaveURL(/.*login|http:\/\/localhost:3000\/?/);
      
      const postLogoutCookies = await page.context().cookies();
      const clearedToken = postLogoutCookies.find(c => c.name === 'aligne_token');
      expect(clearedToken).toBeFalsy();
    }
  });

  test('Should show error message for invalid credentials or inactive accounts', async ({ page }) => {
    await page.locator('text=Master Ulaz').click();

    await page.locator('input[type="email"]').fill('wrong-admin@aligne.com');
    await page.locator('input[type="password"]').fill('WrongPassword123');
    await page.getByRole('button', { name: /Pristupi panelu/i }).click();

    await expect(page.locator('text=NEISPRAVAN EMAIL ILI LOZINKA.')).toBeVisible();
  });

  test('Empty email or password fields should prevent form submission', async ({ page }) => {
    await page.locator('text=Master Ulaz').click();

    
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /Pristupi panelu/i }).click();
    
    await expect(page.locator('input[type="email"]')).toBeVisible(); 

    
    await page.locator('input[type="password"]').fill('');
    await page.locator('input[type="email"]').fill('admin@aligne.com');
    await page.getByRole('button', { name: /Pristupi panelu/i }).click();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});