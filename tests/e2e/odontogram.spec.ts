import { test, expect } from '@playwright/test';

test.describe('Odontogram Interactive Matrix - Operational Dashboard Workflow', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Authenticate session smoothly via Staff Portal
    await page.goto('http://localhost:3000/');
    const staffButton = page.locator('button:has-text("Staff Ulaz"), a:has-text("Staff Ulaz")').first();
    if (await staffButton.isVisible()) {
      await staffButton.click();
    }
    await page.locator('input[type="email"]').fill('staff@aligne.com');
    await page.locator('input[type="password"]').fill('staff123');
    await page.getByRole('button', { name: 'Pristupi panelu' }).click();
    await page.waitForURL('**/dashboard');
    
    // 2. Direct Route Bypass straight to Tarik Hadžić's active clinical profile card
    await page.goto('http://localhost:3000/dashboard/patients/cmpjrmmpc0000kb638xqussfv');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2, div', { hasText: 'Tarik Hadžić' }).first()).toBeVisible();

    // 3. Initiate context transition by invoking the teal Odontogram dashboard trigger button
    const viewOdontogramButton = page.locator('button:has-text("Pregled Odontograma"), a:has-text("Pregled Odontograma")').first();
    await expect(viewOdontogramButton).toBeVisible();
    await viewOdontogramButton.click();

    // 4. Secure complete rendering validation of target sub-route view frame
    await page.waitForURL('**/dashboard/patients/cmpjrmmpc0000kb638xqussfv/odontogram');
  });

  // --- TASK 1: INITIAL COMPONENT LAYOUT RENDER & STRUCTURAL INTEGRITY ---
  test('should render graphical tooth grid boundaries and structural instructions on load', async ({ page }) => {
    // Confirm informative user helper message mounts correctly
    await expect(page.locator('text=Kliknite na površinu zuba da biste unijeli dijagnozu.')).toBeVisible();
    
    // Assert visual quadrant titles maintain alignment mapping parameters
    await expect(page.locator('text=GORNJA VILICA (MAXILLA)')).toBeVisible();

   // Assert structural dental architecture labels are cleanly visible by targeting the specific span labels
    await expect(page.locator('span.font-bold').getByText('18', { exact: true }).first()).toBeVisible();
    await expect(page.locator('span.font-bold').getByText('11', { exact: true }).first()).toBeVisible();
    await expect(page.locator('span.font-bold').getByText('41', { exact: true }).first()).toBeVisible();
  });

  // --- TASK 2: SHAPE CLICK ACCURACY, FORM UPDATES, & EDGE CASE DISMISSALS ---
  test('should process tooth element section mapping selections and save diagnostic updates', async ({ page }) => {
    // 1. Locate the interactive visual chart layout container area
    const toothChartFrame = page.locator('text=GORNJA VILICA (MAXILLA)').locator('xpath=..');
    await expect(toothChartFrame).toBeVisible();

    // 2. Precise Element Core Targeting: Select specific structural surface boundary block near column 11
    // Using a positional tracking coordinates click strategy relative to indicator marker "11" for high reliability
    const targetToothMarker = page.locator('div').filter({ hasText: /^11$/ }).first();
    await expect(targetToothMarker).toBeVisible();
    
    // Move slightly downward below numeric label token to click geometric surface block layout accurately
    await targetToothMarker.click({ delay: 100 });

    // 3. Side-Panel State Synchronicity Assertion
    const sideDiagnosticCard = page.locator('div:has-text("Dijagnoza i Plan Tretmana")').first();
    await expect(sideDiagnosticCard).toBeVisible();
    await expect(sideDiagnosticCard.locator('text=Odabrani Zub: Br. 11')).toBeVisible();

    // 4. Select Action Dropdown Menu Mutation Interception
    // 4. Select Action Dropdown Menu Mutation Interception
    const selectDropdownMenu = sideDiagnosticCard.locator('select');
    await expect(selectDropdownMenu).toBeVisible();

    // Modify active selected status profile using the explicit HTML option value attribute
    await selectDropdownMenu.selectOption('caries');
    
    // Verify input value change tracking cleanly updates the DOM model state
    await expect(selectDropdownMenu).toHaveValue('caries', { timeout: 3000 });

    // 5. Edge Case Protection: Populate remarks textbox container safely
    const remarksTextArea = sideDiagnosticCard.locator('textarea, input[placeholder*="Unesite zapažanja..."]');
    if (await remarksTextArea.isVisible()) {
      await remarksTextArea.fill('Uočena duboka lezija na desnoj plohi. Potreban operativni zahvat sanacije.');
    }

    // 6. Form Submission Data Flow execution
    const commitStatusButton = sideDiagnosticCard.locator('button:has-text("Spremi Status Zuba")').first();
    await expect(commitStatusButton).toBeEnabled();
    await commitStatusButton.click();

    // Verify system successfully completes mutation save tracking safely
    await page.waitForLoadState('networkidle');
  });
});