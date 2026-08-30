import { test as base } from '@playwright/test';
import { LoginPage } from '../page/LoginPage';
import { InventoryPage } from '../page/InventoryPage';
import { CartPage } from '../page/CartPage';
import { CheckoutPage } from '../page/CheckoutPage';
import { CheckoutStepTwoPage } from '../page/CheckoutStepTwoPage';

type Fixtures = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  checkoutStepTwoPage: CheckoutStepTwoPage;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  checkoutStepTwoPage: async ({ page }, use) => {
    await use(new CheckoutStepTwoPage(page));
  },
});

export { expect } from '@playwright/test';
