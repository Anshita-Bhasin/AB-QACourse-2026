import { test, expect } from '../fixtures';

test.beforeEach(async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login('standard_user', 'secret_sauce');
});

test('cart shows added items with correct name', async ({ inventoryPage, cartPage }) => {
  await inventoryPage.addItemToCartByName('Sauce Labs Backpack');
  await inventoryPage.addItemToCartByName('Sauce Labs Bike Light');
  await inventoryPage.goToCart();

  await expect(cartPage.cartItems).toHaveCount(2);
  await expect(cartPage.itemNames).toHaveText(['Sauce Labs Backpack', 'Sauce Labs Bike Light']);
});

test('removing an item from the cart page updates the list and badge', async ({
  inventoryPage,
  cartPage,
}) => {
  await inventoryPage.addItemToCartByName('Sauce Labs Backpack');
  await inventoryPage.goToCart();
  await expect(cartPage.cartItems).toHaveCount(1);

  await cartPage.removeItemByName('Sauce Labs Backpack');

  await expect(cartPage.cartItems).toHaveCount(0);
  await expect(inventoryPage.cartBadge).toBeHidden();
});

test('continue shopping returns to the inventory page', async ({ inventoryPage, cartPage }) => {
  await inventoryPage.addItemToCartByName('Sauce Labs Backpack');
  await inventoryPage.goToCart();

  await cartPage.continueShopping();

  await expect(inventoryPage.page).toHaveURL(/.*inventory\.html/);
  await expect(inventoryPage.inventoryContainer).toBeVisible();
});

test('checkout button navigates to checkout information page', async ({
  inventoryPage,
  cartPage,
}) => {
  await inventoryPage.addItemToCartByName('Sauce Labs Backpack');
  await inventoryPage.goToCart();

  await cartPage.proceedToCheckout();

  await expect(inventoryPage.page).toHaveURL(/.*checkout-step-one\.html/);
});
