import { expect, test } from '@playwright/test';
test('client books a service and owner sees it', async ({ page }) => {
  await page.goto('/s/graphite');
  await page.getByRole('link', { name: /Выбрать услугу/i }).click();
  await page.getByRole('button', { name: /Керамика кузова/i }).click();
  await page.locator('.date-grid button').first().click();
  await page.getByRole('button', { name: /09:00|10:00/ }).first().click();
  await page.getByRole('textbox', { name: 'Имя' }).fill('Тестовый клиент');
  await page.getByRole('textbox', { name: 'Телефон' }).fill('+79990000000');
  await page.getByRole('button', { name: /Проверить запись/i }).click();
  await page.getByRole('button', { name: /Подтвердить запись/i }).click();
  await expect(page.getByText(/Запись подтверждена/i)).toBeVisible();
  await page.goto('/s/graphite/owner');
  await expect(page.getByText('Тестовый клиент')).toBeVisible();
});
