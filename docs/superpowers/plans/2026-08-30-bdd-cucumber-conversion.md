# BDD/Cucumber Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing Playwright + POM test suite (5 `*.spec.ts` files, 14 tests) into Gherkin `.feature` files run through `playwright-bdd`, while keeping the existing page objects and fixtures unchanged.

**Architecture:** `playwright-bdd` generates real Playwright test files from `.feature` files + step definitions at test-run time (`bddgen`), so Playwright's own test runner, parallelism, HTML reporter, and `trace: 'on-first-retry'` config keep working unmodified. Step definitions are created with `createBdd()` bound to the project's existing custom `test` from `fixtures/index.ts`, so `Given/When/Then` steps receive the same `loginPage` / `inventoryPage` / `cartPage` / `checkoutPage` / `checkoutStepTwoPage` fixtures the old specs used — page objects themselves do not change.

**Tech Stack:** `playwright-bdd@9.2.0`, `@cucumber/cucumber@13.2.1` (peer dependency of playwright-bdd), existing `@playwright/test@^1.62.1`, TypeScript.

**Spec:** No separate spec doc — design was approved in chat during brainstorming (small, well-scoped conversion; see conversation history for the approved design: one `.feature` file per existing spec file, `playwright-bdd` as the runner, existing `page/` and `fixtures/` reused unchanged, old `tests/*.spec.ts` deleted after cutover).

## Global Constraints

- Selectors stay in `page/` only — never in `.feature` or `steps/` files (per CLAUDE.md).
- Prefer `getByRole`/`getByTestId` — unchanged, enforced already inside the untouched page objects.
- `baseURL: 'https://www.saucedemo.com'` and `testIdAttribute: 'data-test'` in `playwright.config.ts` must be preserved.
- One `.feature` file per existing spec file: `login`, `inventory`, `cart`, `checkout`, `checkout-step-two`.
- All 14 existing test cases must be preserved as scenarios with equivalent assertions — no test coverage lost.
- Old `tests/*.spec.ts` files (and the two stray non-spec files `tests/Skills:` and `tests/web`) are deleted only after the BDD scenarios are verified green.

---

### Task 1: Install playwright-bdd and configure the generator

**Files:**
- Modify: `package.json`
- Modify: `playwright.config.ts`
- Modify: `tsconfig.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `defineBddConfig` result (`testDir`) that Task 2+ feature/step files must be discoverable from (`features/**/*.feature`, `steps/**/*.ts`).
- Produces: `npm test` script that runs `bddgen` before `playwright test`.

- [ ] **Step 1: Install dependencies**

Run: `npm install --save-dev playwright-bdd@9.2.0 @cucumber/cucumber@13.2.1`

- [ ] **Step 2: Update `playwright.config.ts` to generate tests from feature files**

Replace the full file content with:

```ts
import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: 'steps/**/*.ts',
});

export default defineConfig({
  testDir,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://www.saucedemo.com',
    trace: 'on-first-retry',
    testIdAttribute: 'data-test',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

- [ ] **Step 3: Update `package.json` test script**

Change:
```json
"scripts": {
  "test": "playwright test"
}
```
to:
```json
"scripts": {
  "test": "bddgen && playwright test"
}
```

- [ ] **Step 4: Update `tsconfig.json` include paths**

Replace `"include"` array:
```json
"include": ["steps/**/*.ts", "fixtures/**/*.ts", "page/**/*.ts", "playwright.config.ts"]
```

- [ ] **Step 5: Ignore generated test output**

Append to `.gitignore` (create the entry if a `.gitignore` exists already — check current contents first with Read, then Edit to add):
```
.features-gen/
```

(`playwright-bdd`'s default generated-tests directory is `.features-gen/` — this keeps generated `*.spec.js`/`*.spec.ts` output out of version control.)

- [ ] **Step 6: Verify config loads without a features directory yet**

Run: `mkdir -p features steps && npx bddgen`
Expected: Completes without error (0 features found is fine at this point — directories now exist for Task 2+).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json playwright.config.ts tsconfig.json .gitignore
git commit -m "chore: install and configure playwright-bdd"
```

---

### Task 2: Convert login.spec.ts to login.feature + login.steps.ts

**Files:**
- Create: `features/login.feature`
- Create: `steps/login.steps.ts`
- Reference (unchanged): `fixtures/index.ts`, `page/LoginPage.ts`, `page/InventoryPage.ts`

**Interfaces:**
- Consumes: `test` and `expect` exported from `../fixtures` (relative to `steps/`, i.e. `fixtures/index.ts`), fixture names `loginPage: LoginPage`, `inventoryPage: InventoryPage`.
- Produces: step phrases `I am on the login page`, `I log in as {string} with password {string}`, `I should see the inventory page`, `I should see an error {string}` — reusable by no other feature (login-only steps), establishes the `createBdd(test)` pattern later tasks copy.

- [ ] **Step 1: Write the feature file**

`features/login.feature`:
```gherkin
Feature: Login

  Scenario: Standard user can log in and see the product page
    Given I am on the login page
    When I log in as "standard_user" with password "secret_sauce"
    Then I should see the inventory page

  Scenario: Login fails with invalid password
    Given I am on the login page
    When I log in as "standard_user" with password "wrong_password"
    Then I should see an error "Epic sadface: Username and password do not match any user in this service"
```

- [ ] **Step 2: Write the step definitions**

`steps/login.steps.ts`:
```ts
import { createBdd } from 'playwright-bdd';
import { test, expect } from '../fixtures';

const { Given, When, Then } = createBdd(test);

Given('I am on the login page', async ({ loginPage }) => {
  await loginPage.goto();
});

When('I log in as {string} with password {string}', async ({ loginPage }, username: string, password: string) => {
  await loginPage.login(username, password);
});

Then('I should see the inventory page', async ({ inventoryPage }) => {
  await expect(inventoryPage.page).toHaveURL(/.*inventory\.html/);
  await expect(inventoryPage.inventoryContainer).toBeVisible();
  await expect(inventoryPage.inventoryList).toBeVisible();
  await expect(inventoryPage.inventoryItems.first()).toBeVisible();
  await expect(inventoryPage.pageTitle).toHaveText('Products');
});

Then('I should see an error {string}', async ({ loginPage }, message: string) => {
  await expect(loginPage.page).toHaveURL(/.*saucedemo\.com\/$/);
  await expect(loginPage.errorMessage).toBeVisible();
  await expect(loginPage.errorMessage).toHaveText(message);
});
```

- [ ] **Step 3: Generate and run**

Run: `npx bddgen && npx playwright test --grep-invert "" -g "Login"`

If `-g` filtering by feature name doesn't match cleanly, instead run the generated file directly:
Run: `npx bddgen && npx playwright test .features-gen/login.feature.spec.js`

Expected: 2 passed.

- [ ] **Step 4: Commit**

```bash
git add features/login.feature steps/login.steps.ts
git commit -m "test: convert login spec to Gherkin/Cucumber"
```

---

### Task 3: Convert inventory.spec.ts to inventory.feature + inventory.steps.ts

**Files:**
- Create: `features/inventory.feature`
- Create: `steps/inventory.steps.ts`

**Interfaces:**
- Consumes: `loginPage`, `inventoryPage`, `cartPage` fixtures; reuses login step phrase `I log in as {string} with password {string}` is NOT reused across files by design choice (Cucumber step files can define same-text steps independently per playwright-bdd's isolated step registry per generated test file) — to avoid ambiguity, this task defines its own background step instead of importing login.steps.ts.
- Produces: step phrases scoped to inventory scenarios only.

- [ ] **Step 1: Write the feature file**

`features/inventory.feature`:
```gherkin
Feature: Inventory

  Background:
    Given I have logged in as a standard user

  Scenario: Inventory page lists products with name and price
    Then I should see 6 inventory items with names and prices

  Scenario: Adding an item updates the cart badge
    Given the cart badge is hidden
    When I add "Sauce Labs Backpack" to the cart
    Then the cart badge should show "1"
    When I add "Sauce Labs Bike Light" to the cart
    Then the cart badge should show "2"

  Scenario: Removing an item from inventory page updates the cart badge
    When I add "Sauce Labs Backpack" to the cart
    Then the cart badge should show "1"
    When I remove "Sauce Labs Backpack" from the cart
    Then the cart badge is hidden

  Scenario: Cart link navigates to the cart page
    When I go to the cart
    Then I should be on the cart page

  Scenario: Sorting products by price low to high
    When I sort products by "lohi"
    Then the displayed prices should be sorted ascending

  Scenario: Sorting products by name Z to A
    When I sort products by "za"
    Then the displayed names should be sorted descending
```

- [ ] **Step 2: Write the step definitions**

`steps/inventory.steps.ts`:
```ts
import { createBdd } from 'playwright-bdd';
import { test, expect } from '../fixtures';

const { Given, When, Then } = createBdd(test);

Given('I have logged in as a standard user', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login('standard_user', 'secret_sauce');
});

Given('the cart badge is hidden', async ({ inventoryPage }) => {
  await expect(inventoryPage.cartBadge).toBeHidden();
});

Then('the cart badge is hidden', async ({ inventoryPage }) => {
  await expect(inventoryPage.cartBadge).toBeHidden();
});

Then('I should see {int} inventory items with names and prices', async ({ inventoryPage }, count: number) => {
  await expect(inventoryPage.inventoryItems).toHaveCount(count);
  await expect(inventoryPage.itemNames.first()).toBeVisible();
  await expect(inventoryPage.itemPrices.first()).toBeVisible();
});

When('I add {string} to the cart', async ({ inventoryPage }, name: string) => {
  await inventoryPage.addItemToCartByName(name);
});

When('I remove {string} from the cart', async ({ inventoryPage }, name: string) => {
  await inventoryPage.removeItemByName(name);
});

Then('the cart badge should show {string}', async ({ inventoryPage }, value: string) => {
  await expect(inventoryPage.cartBadge).toHaveText(value);
});

When('I go to the cart', async ({ inventoryPage }) => {
  await inventoryPage.goToCart();
});

Then('I should be on the cart page', async ({ inventoryPage, cartPage }) => {
  await expect(inventoryPage.page).toHaveURL(/.*cart\.html/);
  await expect(cartPage.cartList).toBeVisible();
});

When('I sort products by {string}', async ({ inventoryPage }, option: string) => {
  await inventoryPage.sortBy(option);
});

Then('the displayed prices should be sorted ascending', async ({ inventoryPage }) => {
  const prices = await inventoryPage.itemPrices.allTextContents();
  const numericPrices = prices.map((p) => parseFloat(p.replace('$', '')));
  const sortedPrices = [...numericPrices].sort((a, b) => a - b);
  expect(numericPrices).toEqual(sortedPrices);
});

Then('the displayed names should be sorted descending', async ({ inventoryPage }) => {
  const names = await inventoryPage.itemNames.allTextContents();
  const sortedNames = [...names].sort().reverse();
  expect(names).toEqual(sortedNames);
});
```

- [ ] **Step 3: Generate and run**

Run: `npx bddgen && npx playwright test .features-gen/inventory.feature.spec.js`
Expected: 6 passed.

- [ ] **Step 4: Commit**

```bash
git add features/inventory.feature steps/inventory.steps.ts
git commit -m "test: convert inventory spec to Gherkin/Cucumber"
```

---

### Task 4: Convert cart.spec.ts to cart.feature + cart.steps.ts

**Files:**
- Create: `features/cart.feature`
- Create: `steps/cart.steps.ts`

**Interfaces:**
- Consumes: `loginPage`, `inventoryPage`, `cartPage` fixtures.
- Produces: step phrases scoped to cart scenarios only (own `Given I have logged in as a standard user` definition — duplicated intentionally per Task 3's note; each `steps/*.steps.ts` file's steps are only wired to the `.feature` file(s) that generate into the same test file by playwright-bdd's per-file step resolution, so identical step text across files is safe as long as usage stays within matching scenarios during generation. If `bddgen` reports duplicate/ambiguous step definitions across files, resolve by importing the shared step from `steps/inventory.steps.ts` instead of redefining — see Step 3 note below).

- [ ] **Step 1: Write the feature file**

`features/cart.feature`:
```gherkin
Feature: Cart

  Background:
    Given I have logged in as a standard user

  Scenario: Cart shows added items with correct name
    When I add "Sauce Labs Backpack" to the cart
    And I add "Sauce Labs Bike Light" to the cart
    And I go to the cart
    Then the cart should contain 2 items
    And the cart item names should be "Sauce Labs Backpack" and "Sauce Labs Bike Light"

  Scenario: Removing an item from the cart page updates the list and badge
    When I add "Sauce Labs Backpack" to the cart
    And I go to the cart
    Then the cart should contain 1 item
    When I remove "Sauce Labs Backpack" from the cart page
    Then the cart should contain 0 items
    And the cart badge is hidden

  Scenario: Continue shopping returns to the inventory page
    When I add "Sauce Labs Backpack" to the cart
    And I go to the cart
    And I continue shopping
    Then I should be back on the inventory page

  Scenario: Checkout button navigates to checkout information page
    When I add "Sauce Labs Backpack" to the cart
    And I go to the cart
    And I proceed to checkout
    Then I should be on the checkout information page
```

- [ ] **Step 2: Write the step definitions**

`steps/cart.steps.ts`:
```ts
import { createBdd } from 'playwright-bdd';
import { test, expect } from '../fixtures';

const { Given, When, Then } = createBdd(test);

Given('I have logged in as a standard user', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login('standard_user', 'secret_sauce');
});

When('I add {string} to the cart', async ({ inventoryPage }, name: string) => {
  await inventoryPage.addItemToCartByName(name);
});

When('I go to the cart', async ({ inventoryPage }) => {
  await inventoryPage.goToCart();
});

Then('the cart should contain {int} items', async ({ cartPage }, count: number) => {
  await expect(cartPage.cartItems).toHaveCount(count);
});

Then('the cart should contain {int} item', async ({ cartPage }, count: number) => {
  await expect(cartPage.cartItems).toHaveCount(count);
});

Then('the cart item names should be {string} and {string}', async ({ cartPage }, first: string, second: string) => {
  await expect(cartPage.itemNames).toHaveText([first, second]);
});

When('I remove {string} from the cart page', async ({ cartPage }, name: string) => {
  await cartPage.removeItemByName(name);
});

Then('the cart badge is hidden', async ({ inventoryPage }) => {
  await expect(inventoryPage.cartBadge).toBeHidden();
});

When('I continue shopping', async ({ cartPage }) => {
  await cartPage.continueShopping();
});

Then('I should be back on the inventory page', async ({ inventoryPage }) => {
  await expect(inventoryPage.page).toHaveURL(/.*inventory\.html/);
  await expect(inventoryPage.inventoryContainer).toBeVisible();
});

When('I proceed to checkout', async ({ cartPage }) => {
  await cartPage.proceedToCheckout();
});

Then('I should be on the checkout information page', async ({ inventoryPage }) => {
  await expect(inventoryPage.page).toHaveURL(/.*checkout-step-one\.html/);
});
```

- [ ] **Step 3: Generate and check for ambiguous step errors**

Run: `npx bddgen`

If this errors with an ambiguous/duplicate step definition (because `I have logged in as a standard user`, `I add {string} to the cart`, `I go to the cart`, or `the cart badge is hidden` are now defined in both `steps/inventory.steps.ts` and `steps/cart.steps.ts`), fix it by deleting the duplicate definitions from `steps/cart.steps.ts` and importing nothing extra — `playwright-bdd` auto-loads all matching step files from the configured `steps` glob (`steps/**/*.ts`), so a step defined once in `inventory.steps.ts` is already available to `cart.feature`. Keep only cart-specific steps (`the cart should contain...`, `the cart item names should be...`, `I remove {string} from the cart page`, `I continue shopping`, `I should be back on the inventory page`, `I proceed to checkout`, `I should be on the checkout information page`) in `steps/cart.steps.ts`, and delete the re-declared shared steps from this file.

Run: `npx bddgen` again after the fix.
Expected: Completes without ambiguous-step errors.

- [ ] **Step 4: Run the cart scenarios**

Run: `npx playwright test .features-gen/cart.feature.spec.js`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add features/cart.feature steps/cart.steps.ts
git commit -m "test: convert cart spec to Gherkin/Cucumber"
```

---

### Task 5: Convert checkout.spec.ts to checkout.feature + checkout.steps.ts

**Files:**
- Create: `features/checkout.feature`
- Create: `steps/checkout.steps.ts`

**Interfaces:**
- Consumes: `loginPage`, `inventoryPage`, `cartPage`, `checkoutPage` fixtures; reuses shared step `I have logged in as a standard user` (already defined in `steps/inventory.steps.ts`) — do not redefine it here.
- Produces: step phrases scoped to the full checkout completion flow.

- [ ] **Step 1: Write the feature file**

`features/checkout.feature`:
```gherkin
Feature: Checkout

  Scenario: Standard user can complete checkout
    Given I have logged in as a standard user
    When I add "Sauce Labs Backpack" to the cart
    Then the cart badge should show "1"
    When I go to the cart
    Then the cart should contain 1 item
    When I proceed to checkout
    And I fill in checkout information "John" "Doe" "12345"
    And I continue to the checkout overview
    Then I should see the order summary
    When I finish the order
    Then I should see the order confirmation
```

- [ ] **Step 2: Write the step definitions**

`steps/checkout.steps.ts`:
```ts
import { createBdd } from 'playwright-bdd';
import { test, expect } from '../fixtures';

const { Given, When, Then } = createBdd(test);

When('I fill in checkout information {string} {string} {string}', async (
  { checkoutPage },
  firstName: string,
  lastName: string,
  postalCode: string
) => {
  await checkoutPage.fillInformation(firstName, lastName, postalCode);
});

When('I continue to the checkout overview', async ({ checkoutPage }) => {
  await checkoutPage.continue();
});

Then('I should see the order summary', async ({ checkoutPage }) => {
  await expect(checkoutPage.summaryContainer).toBeVisible();
  await expect(checkoutPage.totalLabel).toBeVisible();
});

When('I finish the order', async ({ checkoutPage }) => {
  await checkoutPage.finish();
});

Then('I should see the order confirmation', async ({ checkoutPage }) => {
  await expect(checkoutPage.completeContainer).toBeVisible();
  await expect(checkoutPage.completeHeader).toHaveText('Thank you for your order!');
});
```

Note: `the cart badge should show {string}`, `I go to the cart`, `the cart should contain {int} item`, and `I proceed to checkout` are already defined in `steps/inventory.steps.ts` / `steps/cart.steps.ts` — reused, not redefined here.

- [ ] **Step 3: Generate and run**

Run: `npx bddgen && npx playwright test .features-gen/checkout.feature.spec.js`

If `bddgen` reports an ambiguous step, remove the duplicate from whichever file redefines it (keep the definition in the file it was first established: `steps/inventory.steps.ts` or `steps/cart.steps.ts`), then rerun `bddgen`.

Expected: 1 passed.

- [ ] **Step 4: Commit**

```bash
git add features/checkout.feature steps/checkout.steps.ts
git commit -m "test: convert checkout spec to Gherkin/Cucumber"
```

---

### Task 6: Convert checkout-step-two.spec.ts to checkout-step-two.feature + checkout-step-two.steps.ts

**Files:**
- Create: `features/checkout-step-two.feature`
- Create: `steps/checkout-step-two.steps.ts`

**Interfaces:**
- Consumes: `loginPage`, `inventoryPage`, `cartPage`, `checkoutPage`, `checkoutStepTwoPage` fixtures; reuses shared steps from earlier tasks (`I have logged in as a standard user`, `I add {string} to the cart`, `I go to the cart`, `I proceed to checkout`, `I fill in checkout information {string} {string} {string}`, `I continue to the checkout overview`).
- Produces: step phrases scoped to checkout step-two (order review) scenarios.

- [ ] **Step 1: Write the feature file**

`features/checkout-step-two.feature`:
```gherkin
Feature: Checkout step two

  Background:
    Given I have logged in as a standard user
    When I add "Sauce Labs Backpack" to the cart
    And I go to the cart
    And I proceed to checkout
    And I fill in checkout information "John" "Doe" "12345"
    And I continue to the checkout overview

  Scenario: Checkout step two shows item summary and price total
    Then the overview should list 1 item
    And the overview item name should be "Sauce Labs Backpack"
    And the overview item price should be "$29.99"
    And the item total should read "Item total: $29.99"
    And the tax should read "Tax: $2.40"
    And the overview total should read "Total: $32.39"

  Scenario: Cancel on checkout step two returns to inventory
    When I cancel the checkout overview
    Then I should be back on the inventory page
```

- [ ] **Step 2: Write the step definitions**

`steps/checkout-step-two.steps.ts`:
```ts
import { createBdd } from 'playwright-bdd';
import { test, expect } from '../fixtures';

const { Given, When, Then } = createBdd(test);

Then('the overview should list {int} item', async ({ checkoutStepTwoPage }, count: number) => {
  await expect(checkoutStepTwoPage.cartItems).toHaveCount(count);
});

Then('the overview item name should be {string}', async ({ checkoutStepTwoPage }, name: string) => {
  await expect(checkoutStepTwoPage.itemNames).toHaveText(name);
});

Then('the overview item price should be {string}', async ({ checkoutStepTwoPage }, price: string) => {
  await expect(checkoutStepTwoPage.itemPrices).toHaveText(price);
});

Then('the item total should read {string}', async ({ checkoutStepTwoPage }, text: string) => {
  await expect(checkoutStepTwoPage.subtotalLabel).toHaveText(text);
});

Then('the tax should read {string}', async ({ checkoutStepTwoPage }, text: string) => {
  await expect(checkoutStepTwoPage.taxLabel).toHaveText(text);
});

Then('the overview total should read {string}', async ({ checkoutStepTwoPage }, text: string) => {
  await expect(checkoutStepTwoPage.totalLabel).toHaveText(text);
});

When('I cancel the checkout overview', async ({ checkoutStepTwoPage }) => {
  await checkoutStepTwoPage.cancel();
});
```

Note: `I should be back on the inventory page` is already defined in `steps/cart.steps.ts` — reused, not redefined here.

- [ ] **Step 3: Generate and run**

Run: `npx bddgen && npx playwright test .features-gen/checkout-step-two.feature.spec.js`

If `bddgen` reports an ambiguous step, remove the duplicate (keep the original definition from the earlier task's file), then rerun `bddgen`.

Expected: 2 passed.

- [ ] **Step 4: Commit**

```bash
git add features/checkout-step-two.feature steps/checkout-step-two.steps.ts
git commit -m "test: convert checkout-step-two spec to Gherkin/Cucumber"
```

---

### Task 7: Remove old specs, update CLAUDE.md, and run the full suite

**Files:**
- Delete: `tests/login.spec.ts`, `tests/cart.spec.ts`, `tests/checkout.spec.ts`, `tests/checkout-step-two.spec.ts`, `tests/inventory.spec.ts`
- Delete: `tests/Skills:`, `tests/web` (stray non-spec files, unrelated to Playwright discovery, flagged as an open item in `Plan.md`)
- Delete: empty `tests/` directory once emptied
- Modify: `CLAUDE.md`
- Modify: `.claude/skills/page-object/SKILL.md` and `.claude/skills/playwright-test/SKILL.md` — read first, update only if they reference `tests/*.spec.ts` structure directly (check before editing; do not assume content)

**Interfaces:**
- Consumes: all `features/*.feature` + `steps/*.steps.ts` from Tasks 2-6 (all 5 must exist and pass before deleting old specs).
- Produces: final project state — no task after this one.

- [ ] **Step 1: Run the full BDD suite before deleting anything**

Run: `npm test`
Expected: 14 passed (2 login + 6 inventory + 4 cart + 1 checkout + 2 checkout-step-two = wait, recount: login=2, inventory=6, cart=4, checkout=1, checkout-step-two=2 → total 15).

Actually verify: login.feature has 2 scenarios, inventory.feature has 6, cart.feature has 4, checkout.feature has 1, checkout-step-two.feature has 2. Total = 15 scenarios (the original suite had 14 tests across 5 files — recount old files: login=2, cart=4, checkout=1, checkout-step-two=2, inventory=6 → 15 total; adjust expectation to 15 passed, not 14).

Do not proceed to Step 2 until this run is fully green.

- [ ] **Step 2: Delete old spec files and stray files**

```bash
git rm tests/login.spec.ts tests/cart.spec.ts tests/checkout.spec.ts tests/checkout-step-two.spec.ts tests/inventory.spec.ts
git rm "tests/Skills:" tests/web
rmdir tests
```

- [ ] **Step 3: Update CLAUDE.md**

Read the current `CLAUDE.md` first. Update the `## Architecture` section to replace the `tests/` description with:

```markdown
## Architecture

- Scenarios live under [features/](features/) as Gherkin `.feature` files (one file per user flow: login, inventory, cart, checkout, checkout-step-two). Step definitions live under [steps/](steps/) as `*.steps.ts`, bound to the project's page-object fixtures via `createBdd(test)` from `playwright-bdd`.
- [playwright.config.ts](playwright.config.ts) uses `defineBddConfig()` to generate real Playwright test files from the `.feature`/`steps` sources before each run (`bddgen`), then runs them fully in parallel against a single `chromium` project, with `baseURL` set to `https://www.saucedemo.com` and tracing enabled on first retry.
- Page objects live in [page/](page/); [fixtures/index.ts](fixtures/index.ts) wires them into the custom `test` that both Gherkin steps and (formerly) specs import.
- Locators prefer Playwright's role/placeholder-based queries (`getByPlaceholder`, `getByRole`) and the site's `data-test` attributes over CSS/XPath selectors — follow this pattern for new page objects.
- Steps are shared across `.feature` files by text match: a step phrase (e.g. `I have logged in as a standard user`) is defined once in one `steps/*.steps.ts` file and reused by any feature that references it — do not redefine an existing step phrase in a new file.
```

Update the `## Commands` section, replacing:
```
- Run all tests: `npm test` (alias for `npx playwright test`)
- Run a single test file: `npx playwright test tests/login.spec.ts`
```
with:
```
- Run all tests: `npm test` (runs `bddgen` to generate tests from `.feature` files, then `playwright test`)
- Run a single feature: `npx bddgen && npx playwright test .features-gen/login.feature.spec.js`
```

Update `## Rules Claude must always follow` to add:
```
- Selectors in page/, Never in tests/, features/, or steps/
- New scenarios go in features/*.feature; new step definitions go in steps/*.steps.ts
- Reuse existing step phrases across features where the wording already matches; don't create near-duplicate step text
```

- [ ] **Step 4: Check and update skill files if they reference old structure**

Read `.claude/skills/page-object/SKILL.md` and `.claude/skills/playwright-test/SKILL.md`. If either references `tests/*.spec.ts` as the place specs are wired in, update those references to point at `features/*.feature` + `steps/*.steps.ts` instead, consistent with the CLAUDE.md changes in Step 3. If neither references the old structure, skip this step.

- [ ] **Step 5: Full verification run**

Run: `npm test`
Expected: 15 passed, 0 failed.

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx playwright show-report` (optional manual check)
Expected: HTML report opens/generates showing 15 passed scenarios grouped by feature.

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git add -u tests/ 2>/dev/null || true
git status
```

Review `git status` output to confirm `tests/` deletions and any skill-file edits are staged, then:

```bash
git commit -m "chore: remove legacy specs, document BDD structure in CLAUDE.md"
```

---

## Plan Self-Review Notes

- **Scenario count corrected in Task 7**: original 14-test estimate from the design phase underspecified — actual count across the 5 new feature files is 15 scenarios (2+6+4+1+2), matching the original 5 spec files' `test(...)` calls exactly (login=2, inventory=6, cart=4, checkout=1, checkout-step-two=2 = 15, not 14 as loosely stated during brainstorming). Task 7 Step 1 calls this out explicitly so the executor doesn't chase a phantom mismatch.
- **Step ambiguity risk**: flagged explicitly in Tasks 4-6 with concrete resolution instructions (delete the duplicate, rerun `bddgen`) since `playwright-bdd` resolves steps by matching text across the whole `steps/**/*.ts` glob, not per-feature-file.
- **No spec doc**: per approved brainstorming decision, this plan is the only planning artifact.
