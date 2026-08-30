# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Playwright end-to-end test suite targeting the [Sauce Demo](https://www.saucedemo.com) sample e-commerce site (configured as `baseURL` in [playwright.config.ts](playwright.config.ts)). Tests are written in TypeScript.

## Project :SauceDemo E2E Automation

## What this is 
Playwright end to end test written in typescript
Follow POM

## Rules Claude must always follow
- Use fixtures with POM, Selectors in page/, Never in tests/
- Prefer getByRole, getByTestId

## Commands

- Run all tests: `npm test` (alias for `npx playwright test`)
- Run a single test file: `npx playwright test tests/login.spec.ts`
- Run a single test by name: `npx playwright test -g "standard user can log in"`
- Run in headed mode: `npx playwright test --headed`
- Run in debug mode: `npx playwright test --debug`
- View the HTML report after a run: `npx playwright show-report`
- Install browsers (first-time setup): `npx playwright install`

## Architecture

- All specs live under [tests/](tests/) and follow the `*.spec.ts` naming convention picked up by Playwright's default test runner config.
- [playwright.config.ts](playwright.config.ts) runs tests fully in parallel against a single `chromium` project, with `baseURL` set to `https://www.saucedemo.com` and tracing enabled on first retry.
- Tests use relative navigation (`page.goto('/')`) against the configured `baseURL` rather than hardcoded URLs.
- Locators prefer Playwright's role/placeholder-based queries (`getByPlaceholder`, `getByRole`) and the site's `data-test` attributes over CSS/XPath selectors — follow this pattern for new tests.
- No page object model or shared fixtures exist yet; each spec is currently self-contained.
