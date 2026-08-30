# SauceDemo E2E Automation

End-to-end test suite for the [Sauce Demo](https://www.saucedemo.com) sample e-commerce site, built with [Playwright](https://playwright.dev/) and TypeScript, following the Page Object Model (POM).

## Tech Stack

- [Playwright Test](https://playwright.dev/docs/intro) — test runner, assertions, browser automation
- TypeScript
- Chromium (single browser project)

## Project Structure

```
.
├── tests/                    # Spec files (*.spec.ts), picked up by Playwright's default runner
│   ├── login.spec.ts
│   ├── inventory.spec.ts
│   ├── cart.spec.ts
│   ├── checkout.spec.ts
│   └── checkout-step-two.spec.ts
├── page/                     # Page Object classes — all selectors live here, never in tests/
│   ├── LoginPage.ts
│   ├── InventoryPage.ts
│   ├── CartPage.ts
│   ├── CheckoutPage.ts
│   └── CheckoutStepTwoPage.ts
├── fixtures/
│   └── index.ts               # Custom Playwright test fixture — injects page objects into tests
├── playwright.config.ts       # baseURL, reporters, tracing, test-id attribute
└── tsconfig.json
```

## Architecture

- **Page Object Model**: Every page object exposes locators (built with `getByRole`, `getByTestId`, `getByPlaceholder`) and action/assertion-ready methods. Spec files never contain raw selectors — they call methods on the fixtures.
- **Fixtures**: [fixtures/index.ts](fixtures/index.ts) extends Playwright's base `test` with one fixture per page object (`loginPage`, `inventoryPage`, `cartPage`, `checkoutPage`, `checkoutStepTwoPage`), each auto-instantiated with the current `page`. Specs import `{ test, expect }` from `../fixtures` instead of `@playwright/test` directly.
- **Config**: [playwright.config.ts](playwright.config.ts) runs tests fully in parallel against a single `chromium` project, with `baseURL` set to `https://www.saucedemo.com`, tracing enabled on first retry, and `testIdAttribute` set to `data-test` (Sauce Demo's custom test-id attribute, not Playwright's default `data-testid`).
- **Selectors**: Locators prefer Playwright's role/placeholder-based queries and the site's `data-test` attributes over CSS/XPath selectors.

## Test Coverage

| Spec | Scenarios |
|---|---|
| `login.spec.ts` | Successful login; login with invalid password |
| `inventory.spec.ts` | Product listing; cart badge updates on add/remove; cart navigation; sorting by price and name |
| `cart.spec.ts` | Cart contents after adding items; item removal; continue shopping; checkout navigation |
| `checkout.spec.ts` | End-to-end checkout completion |
| `checkout-step-two.spec.ts` | Order summary (item, subtotal, tax, total); cancel returns to inventory |

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- npm

### Install

```bash
npm install
npx playwright install    # first-time browser install
```

## Running Tests

```bash
# Run the full suite
npm test

# Run a single spec file
npx playwright test tests/login.spec.ts

# Run a single test by name
npx playwright test -g "standard user can log in"

# Run in headed mode (visible browser)
npx playwright test --headed

# Run in debug mode (step through with Playwright Inspector)
npx playwright test --debug

# View the HTML report after a run
npx playwright show-report
```

## Conventions

- **Selectors in `page/`, never in `tests/`.** Page objects are the only place selectors are defined.
- **Prefer `getByRole` and `getByTestId`** over CSS/XPath selectors.
- **Use fixtures with POM.** Tests consume page objects exclusively through the custom `test` fixture — no direct instantiation in spec files.
- Tests use relative navigation (`page.goto('/')`) against the configured `baseURL` rather than hardcoded URLs.

## Login Credentials

Sauce Demo's standard test account, used throughout the suite:

```
username: standard_user
password: secret_sauce
```
