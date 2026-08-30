import { test, expect } from '../fixtures';

test.beforeEach(async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login('standard_user', 'secret_sauce');
});

test('inventory page lists products with name and price', async ({ inventoryPage }) => {
  await expect(inventoryPage.inventoryItems).toHaveCount(6);
  await expect(inventoryPage.itemNames.first()).toBeVisible();
  await expect(inventoryPage.itemPrices.first()).toBeVisible();
});

test('adding an item updates the cart badge', async ({ inventoryPage }) => {
  await expect(inventoryPage.cartBadge).toBeHidden();

  await inventoryPage.addItemToCartByName('Sauce Labs Backpack');
  await expect(inventoryPage.cartBadge).toHaveText('1');

  await inventoryPage.addItemToCartByName('Sauce Labs Bike Light');
  await expect(inventoryPage.cartBadge).toHaveText('2');
});

test('removing an item from inventory page updates the cart badge', async ({ inventoryPage }) => {
  await inventoryPage.addItemToCartByName('Sauce Labs Backpack');
  await expect(inventoryPage.cartBadge).toHaveText('1');

  await inventoryPage.removeItemByName('Sauce Labs Backpack');
  await expect(inventoryPage.cartBadge).toBeHidden();
});

test('cart link navigates to the cart page', async ({ inventoryPage, cartPage }) => {
  await inventoryPage.goToCart();

  await expect(inventoryPage.page).toHaveURL(/.*cart\.html/);
  await expect(cartPage.cartList).toBeVisible();
});

test('sorting products by price low to high', async ({ inventoryPage }) => {
  await inventoryPage.sortBy('lohi');

  const prices = await inventoryPage.itemPrices.allTextContents();
  const numericPrices = prices.map((p) => parseFloat(p.replace('$', '')));
  const sortedPrices = [...numericPrices].sort((a, b) => a - b);

  expect(numericPrices).toEqual(sortedPrices);
});

test('sorting products by name Z to A', async ({ inventoryPage }) => {
  await inventoryPage.sortBy('za');

  const names = await inventoryPage.itemNames.allTextContents();
  const sortedNames = [...names].sort().reverse();

  expect(names).toEqual(sortedNames);
});
