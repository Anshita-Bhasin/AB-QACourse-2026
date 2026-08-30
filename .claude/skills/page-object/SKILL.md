---
name: page-object
description: Use when asked to create, add, or scaffold a new Playwright page object for this SauceDemo suite — generates page/<Name>Page.ts following the repo's POM conventions and wires it into fixtures/index.ts
---

# Page Object

## Overview

Generates a new Playwright page object class in [page/](../../../page/) for a page the user describes, then wires it into [fixtures/index.ts](../../../fixtures/index.ts) so tests can consume it via the `test` fixture. Follows the conventions already established by `LoginPage`, `InventoryPage`, `CartPage`, and `CheckoutPage`.

## When to Use

- "Create a page object for the X page"
- "Add a POM for..."
- "Scaffold a page object for the checkout confirmation page"

Not for: editing an existing page object's locators (just edit it directly), or writing test specs (page objects only — never put selectors in tests/, per CLAUDE.md).

## Process

1. **Gather the page's elements.** From the user's description, identify each interactive/verifiable element (inputs, buttons, links, containers, text) and the actions a test would perform on the page. If the user hasn't given you a `data-test` value for an element and you cannot inspect the live page (e.g. it's behind a login you can't reach) to confirm one, **stop and ask the user for it or for the real page markup** — do not invent a plausible-looking `data-test` string and merely flag it as a guess. A fabricated selector will silently fail at test-run time; asking costs one round trip.

2. **Write the class** at `page/<Name>Page.ts` following this exact shape (see [page/LoginPage.ts](../../../page/LoginPage.ts) as the canonical example):

```typescript
import { Page, Locator } from '@playwright/test';

export class ExamplePage {
  readonly page: Page;
  readonly someInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.someInput = page.getByPlaceholder('Something');
    this.submitButton = page.getByRole('button', { name: 'Submit' });
  }

  async submit(value: string) {
    await this.someInput.fill(value);
    await this.submitButton.click();
  }
}
```

Rules (from [CLAUDE.md](../../../CLAUDE.md)):
   - All locators live as `readonly` class fields assigned in the constructor — never inline in methods, never in test files.
   - Selector priority: `getByRole` and `getByPlaceholder` first; fall back to `getByTestId` for the site's `data-test` attributes; avoid CSS/XPath.
   - Use the `slugify` + `getByTestId(`prefix-${slug}`)` dynamic-locator pattern (see `CartPage`/`InventoryPage`) only when the page lists multiple items of the same kind at once. If the page shows a single item in context (e.g. a product detail page), use a plain static field for its add/remove button instead — there's nothing to disambiguate.
   - Only add a `goto()` method if this is a page users land on directly (like `LoginPage`); otherwise omit it.
   - If an element (e.g. the cart link/badge) already has a locator in another page object, still declare it on the new page object too — this repo doesn't share locators across page objects, each class owns its own.
   - Action methods are plain `async` methods that compose locator calls — no assertions inside the page object (assertions belong in specs).

3. **Wire it into fixtures.** Open [fixtures/index.ts](../../../fixtures/index.ts) and add the new page object in three places, mirroring the existing entries:
   - Import the class.
   - Add `<name>Page: <Name>Page;` to the `Fixtures` type.
   - Add the `<name>Page: async ({ page }, use) => { await use(new <Name>Page(page)); },` entry to `test.extend`.

   Use a camelCase fixture key matching the class name (`CheckoutConfirmationPage` → `checkoutConfirmationPage`).

4. **Show the diff before saving anything.** Present both the full new page object file content and the exact edit to `fixtures/index.ts` (before/after or a diff-style view) to the user, and wait for their go-ahead before writing either file. Never write files first and show changes after.

## Quick Reference

| Element type | Preferred locator |
|---|---|
| Button | `page.getByRole('button', { name: '...' })` |
| Text input | `page.getByPlaceholder('...')` or `page.getByTestId('...')` if no placeholder |
| Link | `page.getByRole('link', { name: '...' })` |
| Generic container/text/testid-only element | `page.getByTestId('...')` |
| Per-item dynamic element | `slugify()` helper + `page.getByTestId(\`prefix-${slug}\`)` |

## Common Mistakes

- Putting a selector directly in a test file instead of the page object — violates CLAUDE.md.
- Forgetting to update `fixtures/index.ts` after creating the class — the page object exists but no test can use it via the `test` fixture.
- Writing files before showing the user the diff.
- Using CSS/XPath selectors when a `getByRole`/`getByPlaceholder`/`getByTestId` equivalent exists.
