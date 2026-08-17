import { test, expect } from '@playwright/test';

test.describe.skip('Patient Management Workflows', () => {

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
  });

  test('should navigate to patient database and successfully register a new patient', async ({ page }) => {
    // 2. Click on "Baza Pacijenata" side menu option
    const bazaPacijenataMenu = page.locator('a, button').filter({ hasText: /^Baza Pacijenata$/ }).first();
    await bazaPacijenataMenu.click();
    
    // Assert successful navigation to the base list url
    await page.waitForURL('**/dashboard/patients');
    await expect(page.locator('h1, h2')).toContainText('Baza Pacijenata');

    
    await page.locator('button, a').filter({ hasText: /\+\s*Novi\s*pacijent/i }).first().click();
    await page.waitForURL('**/dashboard/patients/create');

    
    await page.locator('label:has-text("Ime i prezime") + input, input[placeholder="Ime i prezime"]').fill('Tarik Hadžić');
    await page.locator('input[type="email"]').fill('tarik.hadzic@gmail.com');
    await page.locator('input[placeholder="+38761123456"]').fill('+38761999888');
    
    
    const jmbLabel = page.locator('text=JMB');
    await page.locator('label:has-text("JMB") + input').fill('2405996170012');
    await page.locator('label:has-text("Zanimanje") + input').fill('Software Engineer');

    
    await page.locator('label').filter({ hasText: /^Zaposlen\/a$/ }).click();
    await page.locator('label:has-text("Adresa") + input').fill('Ferhadija 12, Sarajevo');
    
    // Target date picker mask (dd.mm.gggg)
    await page.locator('input[placeholder="dd.mm.gggg"]').fill('05.04.1996');

    
    
    // 1. "Da li ste alergični?" -> Select "Ne"
    await page.locator('div, section').filter({ hasText: 'Da li ste alergični?' }).locator('label:has-text("Ne")').first().click();

    // 2. "Da li ste ranije primali anesteziju?" -> Select "Ne"
    await page.locator('div, section').filter({ hasText: 'Da li ste ranije primali anesteziju?' }).locator('label:has-text("Ne")').first().click();

    // 3. "Pijete li neke lijekove?" -> Select "Ne"
    await page.locator('div, section').filter({ hasText: 'Pijete li neke lijekove?' }).locator('label:has-text("Ne")').first().click();

    
    await page.locator('label:has-text("Ranije bolesti") + textarea').fill('Prethodna operacija slijepog crijeva 2018. godine.');
    await page.locator('label:has-text("Sadašnja bolest") + textarea').fill('Nema aktivnih hroničnih oboljenja.');
    await page.locator('textarea[placeholder="Dodajte interne napomene..."]').fill('Pacijent preferira popodnevne termine zbog posla.');

    
    await page.getByRole('button', { name: 'Kreiraj pacijenta', exact: true }).click();

    // 4. Verification Step: Check if we are redirected back to the root list
    await page.waitForURL('http://localhost:3000/dashboard/patients');
    
    // Ensure that our new registered patient successfully populated the table list rows
    await expect(page.locator('text=Tarik Hadžić')).toBeVisible();
    await expect(page.locator('text=2405996170012')).toBeVisible();
  });
});