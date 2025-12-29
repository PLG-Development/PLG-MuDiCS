import { expect, test } from '@playwright/test';

test('page loads', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByText('PLG MuDiCS')).toBeVisible();
});

test('page loads without problems', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByText('PLG MuDiCS')).toBeVisible();
	await expect(page.getByTestId('notification')).not.toBeVisible();
});

test('diplay click shows files', async ({ page }) => {
	await page.goto('/');
	await page.getByTestId('display').click();
	await expect(page.getByTestId('inode').first()).toBeVisible();
});

test('show text', async ({ page }) => {
	await page.goto('/');
	await page.getByTestId('display').click();

	const controlButton = page.getByText('Text anzeigen');
	await expect(controlButton).toBeVisible();
	await controlButton.click();

	const textPopup = page.getByTestId('text-popup');
	await expect(textPopup).toBeVisible();
	const textArea = textPopup.getByRole('textbox');
	await expect(textArea).toBeVisible();
	await textArea.fill('Hello, world!');

	const submitButton = textPopup.locator('button').filter({ hasText: 'Text anzeigen' });
	await submitButton.click();
	await expect(
		page.locator('[data-testid="notification"]:not(:has-text("Fehler 500"))')
	).not.toBeVisible();
});
