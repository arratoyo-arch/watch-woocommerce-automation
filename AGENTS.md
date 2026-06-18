
# AGENTS.md

## Repository Scope

This repository is for WooCommerce automation only.

Repository:

```text
watch-woocommerce-automation
```

Primary site:

```text
watch-tokyo.com
```

Do not mix eBay automation into this repository.

Do not add:

* eBay API code
* eBay Active Listing logic
* eBay listing logic
* eBay sales logic
* eBay pricing judgment logic
* eBay sheet automation
* eBay order automation

eBay automation must be handled in a separate repository.

---


## WooCommerce / WDB Only Boundary

This repository is ONLY for WooCommerce and Woo Draft Bridge operations.

Allowed:

* WooCommerce product sync
* Woo Draft Bridge / WDB
* Woo draft candidate generation
* Woo product improvement candidates
* Woo API product read/create/update logic
* watch-tokyo.com product draft workflow

Forbidden:

* eBay Active_listing
* eBay Listing_plan
* Price_Up_Candidates
* Sell Similar
* eBay Trading API
* eBay Revise Price
* Ebay_New_Listing_Candidates
* Ebay_Restock_Candidates

If a task mentions eBay seller operations, stop and say it belongs in `watch-ebay-automation`.

---

## Basic Instruction for Codex

When working in this repository, treat it as a WooCommerce semi-automation project.

Default operation style:

```text
semi-automatic
human-reviewed
preview-before-production
selected-rows-only
```

Do not convert this project into full automatic bulk update logic.

---

## Secrets Policy

Never write secrets into README, source code, comments, logs, examples, or test data.

Do not expose:

* WooCommerce Consumer Key actual value
* WooCommerce Consumer Secret actual value
* Access token
* Refresh token
* Password
* Private API key
* Customer private information

Secrets must be stored only in Google Apps Script Properties.

Allowed Script Properties names:

```text
WOO_SITE_URL
WOO_CONSUMER_KEY
WOO_CONSUMER_SECRET
```

Do not use old property names:

```text
WC_SITE_URL
WC_CONSUMER_KEY
WC_CONSUMER_SECRET
```

---

## Sheet Names

Use the actual production sheet names.

Correct sheet names:

```text
Woo_Products
WC_Keep_Active
```

Do not use the old sheet name:

```text
WC_Products
```

### Woo_Products

`Woo_Products` is the confirmation sheet.

Use it to:

* Check WooCommerce product data
* Confirm SKU, price, stock, product ID, and product name
* Verify results after production update

Do not use it as the main manual update sheet.

### WC_Keep_Active

`WC_Keep_Active` is the main working sheet.

Use it for:

* SKU update preparation
* Price update preparation
* Stock update preparation
* Manual review
* Semi-automatic selected-row updates

---

## Function Rules

### exportWooProductsToSheet()

Use this function to fetch WooCommerce products into `Woo_Products`.

Use it:

* Before review
* After production update
* To confirm current WooCommerce product data

### buildWooKeepActiveCandidates()

Use this function to build or refresh candidates in `WC_Keep_Active`.

### updateWooSkuFromKeepActive()

Use this function only for SKU updates.

Required action:

```text
WC Update Action = UPDATE_SKU
```

### previewWooProductsUpdateFromKeepActive()

This function must be used before any production price or stock update.

It should confirm:

```text
Target rows are expected
Warnings: 0
Errors: 0
```

### updateWooProductsFromKeepActive()

This function performs production price and stock updates.

Allowed actions:

```text
UPDATE
UPDATE_PRICE
UPDATE_STOCK
UPDATE_PRICE_STOCK
```

Do not call this function without a preview step.

After successful update, `WC Update Action` must be cleared.

---

## Action Rules

| WC Update Action   | Purpose                |
| ------------------ | ---------------------- |
| UPDATE_SKU         | SKU update only        |
| UPDATE             | Price and stock update |
| UPDATE_PRICE       | Price update only      |
| UPDATE_STOCK       | Stock update only      |
| UPDATE_PRICE_STOCK | Price and stock update |

Rows without `WC Update Action` must be skipped.

---

## Safe Operation Rules

Always preserve the semi-automatic workflow.

Required rules:

* A human must enter `WC Update Action`
* Only rows with `WC Update Action` may be updated
* Preview must be run before production update
* Production update must not run if preview has warnings
* Production update must not run if target rows are unexpected
* `WC Update Action` must be cleared after success
* Results must be confirmed by running `exportWooProductsToSheet()`
* `Woo_Products` must be used for final confirmation

---

## Batch Size Rule

Initial real operation must be small.

Recommended:

```text
5 to 10 rows
```

Avoid:

```text
100-row bulk update
full automatic update
all-row update without review
```

---

## Confirmed Operation Status

The current confirmed system status is:

```text
WooCommerce API connection: OK
WooCommerce product fetch: OK
Published products fetched: 145
Woo_Products export: OK
SKU registration: OK
SKU registered: 145
SKU blank: 0
WC_Keep_Active workflow: OK
Price and stock preview: OK
Production update: OK
Re-fetch confirmation: OK
Semi-automatic operation: OK
```

---

## Development Guardrails

When editing code or documentation:

* Keep README and actual function names consistent
* Keep README and actual sheet names consistent
* Do not reintroduce old names
* Do not add eBay logic
* Do not add unsafe bulk-update logic
* Do not expose secrets
* Do not remove the preview-before-production rule
* Do not remove the selected-row-only rule
* Do not remove the human-review requirement

---

## Final Review Checklist

Before committing changes, confirm:

```text
□ README.md exists
□ AGENTS.md exists
□ Woo_Products is used
□ WC_Keep_Active is used
□ WOO_SITE_URL is used
□ WOO_CONSUMER_KEY is used
□ WOO_CONSUMER_SECRET is used
□ WC_Products is not used
□ WC_SITE_URL is not used
□ WC_CONSUMER_KEY is not used
□ WC_CONSUMER_SECRET is not used
□ eBay logic is not added
□ secrets are not included
□ preview-before-production rule remains
□ selected-row-only rule remains
□ 5 to 10 row initial operation rule remains
```

---

## Commit Guidance

For documentation completion, use a clear commit message such as:

```text
Add AGENTS instructions
```

For README replacement, use:

```text
Create completed README
```
