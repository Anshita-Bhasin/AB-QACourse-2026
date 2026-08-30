import { test, expect } from '../fixtures';

test('standard user can log in and see the product page', async ({ loginPage, inventoryPage }) => {
  await loginPage.goto();
  await loginPage.login('standard_user', 'secret_sauce');

  await expect(inventoryPage.page).toHaveURL(/.*inventory\.html/);
  await expect(inventoryPage.inventoryContainer).toBeVisible();
  await expect(inventoryPage.inventoryList).toBeVisible();
  await expect(inventoryPage.inventoryItems.first()).toBeVisible();
  await expect(inventoryPage.pageTitle).toHaveText('Products');
});

test('login fails with invalid password', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login('standard_user', 'wrong_password');

  await expect(loginPage.page).toHaveURL(/.*saucedemo\.com\/$/);
  await expect(loginPage.errorMessage).toBeVisible();
  await expect(loginPage.errorMessage).toHaveText(
    'Epic sadface: Username and password do not match any user in this service'
  );
});
