# Refactor to Page Object Model + Fixtures

> Status: Implemented and verified (`npm test` passes, `tsc --noEmit` clean, HTML report generates).

## Context

The project currently has a single self-contained spec ([tests/login.spec.ts](tests/login.spec.ts)) with all selectors and login logic inline. [CLAUDE.md](CLAUDE.md) mandates a POM structure going forward ("Use fixtures with POM, Selectors in page/, Never in tests/", "Prefer getByRole, getByTestId"), but no `page/` or fixtures directory exists yet. As the suite grows (inventory, cart, checkout flows), inline selectors would get duplicated across specs and become hard to maintain. This refactor establishes the POM + fixtures foundation now, before more tests are added.

Two other things found during research:
- The existing test logs in with `'wrong_password'` but asserts a *successful* login (navigation to `inventory.html`) — this was a pre-existing bug. Corrected to use the real valid password (`secret_sauce`).
- `tests/Skills:` and `tests/web` are stray plain-text files (not directories, not specs) sitting inside `tests/`. They're unrelated to Playwright test discovery (only `*.spec.ts` is picked up) but are clutter — flagging for confirmation before deleting; not touched as part of this refactor.

All selectors below were captured by running a real headless Chromium session against `https://www.saucedemo.com` (login → inventory → add to cart → cart → checkout step one), so they're verified against the live site, not guessed.

## Folders created

```
page/
  LoginPage.ts
  InventoryPage.ts
  CartPage.ts
  CheckoutPage.ts
fixtures/
  index.ts
```

`page/` holds all Page Object classes (per CLAUDE.md: "Selectors in page/, Never in tests/"). `fixtures/` holds the custom Playwright test fixture that wires pages together and injects them into tests.

## Page Objects

Each page object exposes locators (built with `getByTestId`/`getByRole`/`getByPlaceholder`, per CLAUDE.md) and action/assertion methods. No raw selector strings appear in spec files.

### `page/LoginPage.ts`
- Locators: `usernameInput` (`getByPlaceholder('Username')`), `passwordInput` (`getByPlaceholder('Password')`), `loginButton` (`getByRole('button', { name: 'Login' })`), `errorMessage` (`getByTestId('error')`)
- Methods: `goto()`, `login(username, password)`

### `page/InventoryPage.ts`
- Locators: `inventoryContainer`, `inventoryList`, `inventoryItems` (`getByTestId('inventory-item')`), `pageTitle` (`getByTestId('title')`), `cartLink` (`getByTestId('shopping-cart-link')`), `cartBadge` (`getByTestId('shopping-cart-badge')`)
- Method: `addItemToCartByName(name)` — maps a product name to its `add-to-cart-<slug>` test id (e.g. `add-to-cart-sauce-labs-backpack`) and clicks it
- Method: `goToCart()` — clicks `cartLink`

### `page/CartPage.ts`
- Locators: `cartList` (`getByTestId('cart-list')`), `cartItems` (`getByTestId('inventory-item')`), `checkoutButton` (`getByTestId('checkout')`), `continueShoppingButton` (`getByTestId('continue-shopping')`)
- Method: `removeItemByName(name)` — uses `remove-<slug>` test id
- Method: `proceedToCheckout()`

### `page/CheckoutPage.ts`
- Locators (step one): `firstNameInput` (`getByTestId('firstName')`), `lastNameInput` (`getByTestId('lastName')`), `postalCodeInput` (`getByTestId('postalCode')`), `continueButton` (`getByTestId('continue')`), `cancelButton` (`getByTestId('cancel')`)
- Methods: `fillInformation(firstName, lastName, postalCode)`, `continue()`

## Fixture file structure

`fixtures/index.ts` extends Playwright's base `test` with one fixture per page object, each auto-instantiated with the current `page`:

```ts
import { test as base } from '@playwright/test';
import { LoginPage } from '../page/LoginPage';
import { InventoryPage } from '../page/InventoryPage';
import { CartPage } from '../page/CartPage';
import { CheckoutPage } from '../page/CheckoutPage';

type Fixtures = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => { await use(new LoginPage(page)); },
  inventoryPage: async ({ page }, use) => { await use(new InventoryPage(page)); },
  cartPage: async ({ page }, use) => { await use(new CartPage(page)); },
  checkoutPage: async ({ page }, use) => { await use(new CheckoutPage(page)); },
});

export { expect } from '@playwright/test';
```

Specs import `{ test, expect }` from `../fixtures` instead of `@playwright/test` directly.

## How the existing test changed

[tests/login.spec.ts](tests/login.spec.ts) is now:

```ts
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
```

Password corrected to `secret_sauce` (the real valid credential) so the test genuinely verifies a successful login instead of accidentally passing with wrong credentials pointed at the right assertion.

## Reporting

Updated [playwright.config.ts](playwright.config.ts) `reporter` from `'list'` to a multi-reporter array, and added `testIdAttribute` under `use` (Sauce Demo uses `data-test`, not Playwright's default `data-testid` — without this, every `getByTestId` call silently fails to match, which is how this was caught):

```ts
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://www.saucedemo.com',
    trace: 'on-first-retry',
    testIdAttribute: 'data-test',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

This keeps concise terminal output during runs and additionally writes an interactive HTML report (viewable via `npx playwright show-report`). `open: 'never'` avoids auto-opening a browser tab after every local run (CI-friendly).

## How selectors were found (for reproducibility)

Sauce Demo's pages are client-rendered, so a plain `curl` only returns an empty SPA shell — this was confirmed and ruled out. Real selectors were captured by scripting headless Chromium (using the project's own installed Playwright) to navigate login → inventory → add-to-cart → cart → checkout-step-one, then dumping every element's `data-test` attribute, tag, placeholder, and role directly from the live DOM. This is the same technique the test suite itself uses, just run ad hoc for reconnaissance — no selectors were guessed or copied from stale docs.

## Verification performed

1. `npm test` — passes (1 passed).
2. `npx playwright test tests/login.spec.ts` — passes standalone.
3. `npx playwright show-report` output confirmed generated at `playwright-report/index.html`.
4. `npx tsc --noEmit` — no type errors across new page objects and fixtures.
5. Confirmed the corrected `secret_sauce` password lands on `inventory.html` with all original assertions intact.

## Open item

`tests/Skills:` and `tests/web` are stray plain-text files unrelated to the suite — confirm whether these can be deleted.
