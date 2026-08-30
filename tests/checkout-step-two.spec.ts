import { test, expect } from '../fixtures';

test('checkout step two shows item summary and price total', async ({
  loginPage,
  inventoryPage,
  cartPage,
  checkoutPage,
  checkoutStepTwoPage,
}) => {
  await loginPage.goto();
  await loginPage.login('standard_user', 'secret_sauce');

  await inventoryPage.addItemToCartByName('Sauce Labs Backpack');
  await inventoryPage.goToCart();

  await cartPage.proceedToCheckout();
  await checkoutPage.fillInformation('John', 'Doe', '12345');
  await checkoutPage.continue();

  await expect(checkoutStepTwoPage.cartItems).toHaveCount(1);
  await expect(checkoutStepTwoPage.itemNames).toHaveText('Sauce Labs Backpack');
  await expect(checkoutStepTwoPage.itemPrices).toHaveText('$29.99');

  await expect(checkoutStepTwoPage.subtotalLabel).toHaveText('Item total: $29.99');
  await expect(checkoutStepTwoPage.taxLabel).toHaveText('Tax: $2.40');
  await expect(checkoutStepTwoPage.totalLabel).toHaveText('Total: $32.39');
});

test('cancel on checkout step two returns to inventory', async ({
  loginPage,
  inventoryPage,
  cartPage,
  checkoutPage,
  checkoutStepTwoPage,
}) => {
  await loginPage.goto();
  await loginPage.login('standard_user', 'secret_sauce');

  await inventoryPage.addItemToCartByName('Sauce Labs Backpack');
  await inventoryPage.goToCart();

  await cartPage.proceedToCheckout();
  await checkoutPage.fillInformation('John', 'Doe', '12345');
  await checkoutPage.continue();

  await checkoutStepTwoPage.cancel();

  await expect(inventoryPage.page).toHaveURL(/.*inventory\.html/);
});
