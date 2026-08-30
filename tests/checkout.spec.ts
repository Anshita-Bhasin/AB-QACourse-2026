import { test, expect } from '../fixtures';

test('standard user can complete checkout', async ({
  loginPage,
  inventoryPage,
  cartPage,
  checkoutPage,
}) => {
  await loginPage.goto();
  await loginPage.login('standard_user', 'secret_sauce');

  await inventoryPage.addItemToCartByName('Sauce Labs Backpack');
  await expect(inventoryPage.cartBadge).toHaveText('1');

  await inventoryPage.goToCart();
  await expect(cartPage.cartItems).toHaveCount(1);

  await cartPage.proceedToCheckout();
  await checkoutPage.fillInformation('John', 'Doe', '12345');
  await checkoutPage.continue();

  await expect(checkoutPage.summaryContainer).toBeVisible();
  await expect(checkoutPage.totalLabel).toBeVisible();

  await checkoutPage.finish();

  await expect(checkoutPage.completeContainer).toBeVisible();
  await expect(checkoutPage.completeHeader).toHaveText('Thank you for your order!');
});
