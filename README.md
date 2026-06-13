
# watch-woocommerce-automation

WooCommerce semi-automation repository for watch-tokyo.com.

This repository is for WooCommerce only.
Do not mix eBay automation, eBay API, eBay Active Listing logic, eBay listing logic, or eBay sales logic into this repository.

---

## Repository Purpose

This project manages WooCommerce product maintenance for watch-tokyo.com using Google Apps Script and Google Sheets.

Main goals:

* Fetch WooCommerce product data into Google Sheets
* Review products manually before update
* Update SKU, price, and stock safely
* Use a semi-automatic workflow
* Keep production updates under human control
* Keep WooCommerce automation separated from eBay automation
* Keep secrets outside README and source code

---

## WooCommerce Only Policy

This repository is dedicated to WooCommerce operations.

Do not add:

* eBay API code
* eBay Active Listing logic
* eBay sales logic
* eBay listing strategy
* eBay pricing judgment logic
* eBay sheet automation

eBay automation must be managed in a separate repository.

---

## Secrets Policy

Never write secrets directly in README, source code, comments, or logs.

Do not commit:

* WooCommerce Consumer Key actual value
* WooCommerce Consumer Secret actual value
* Access token
* Refresh token
* Password
* Private API keys
* Customer private information

Use Google Apps Script Properties only.

Required Script Properties:

```text
WOO_SITE_URL
WOO_CONSUMER_KEY
WOO_CONSUMER_SECRET
```

---

## Main Sheets

### Woo_Products

`Woo_Products` is the confirmation sheet created from WooCommerce API data.

Purpose:

* Check current WooCommerce product status
* Confirm SKU, price, stock, product ID, and product name
* Verify results after production update

This sheet is not the main manual update sheet.

---

### WC_Keep_Active

`WC_Keep_Active` is the main working sheet for WooCommerce maintenance.

Purpose:

* Prepare SKU updates
* Prepare price updates
* Prepare stock updates
* Review products before production update
* Run semi-automatic updates only for selected rows

Important columns:

```text
ID
SKU
Name
Type
Status
Price
Regular Price
Sale Price
Stock Status
Stock Quantity
Categories
Permalink
Date Modified
Error
Duplicate SKU
Woo Action
Last Sync
WC Check
WC Check Note
WC Update Action
New Price
New Stock Status
New Stock Quantity
Update Note
WC Sync Status
WC Synced At
WC Sync Error
```

---

## Main Functions

### exportWooProductsToSheet()

Fetches WooCommerce products and writes them to `Woo_Products`.

Use this function:

* Before review
* After production update
* To confirm current WooCommerce data

Confirmed operation:

```text
WooCommerce API connection: OK
Product count: 145
Woo_Products export: OK
```

---

### buildWooKeepActiveCandidates()

Builds or refreshes update candidates in `WC_Keep_Active`.

Use this function when preparing WooCommerce maintenance candidates.

---

### updateWooSkuFromKeepActive()

Updates product SKU from `WC_Keep_Active`.

Use only for SKU update.

Required action:

```text
WC Update Action = UPDATE_SKU
```

Confirmed operation:

```text
SKU registered: 145
SKU blank: 0
SKU update flow: completed
```

---

### previewWooProductsUpdateFromKeepActive()

Previews price and stock updates before production update.

Always run this before production update.

The preview should confirm:

```text
Target rows are correct
Warnings: 0
Errors: 0
```

Do not run production update if preview has warnings or unexpected rows.

---

### updateWooProductsFromKeepActive()

Runs production update for price and stock from `WC_Keep_Active`.

Allowed actions:

```text
UPDATE
UPDATE_PRICE
UPDATE_STOCK
UPDATE_PRICE_STOCK
```

This function updates WooCommerce product data by API.

After successful update, `WC Update Action` should be cleared so the same row is not updated again by mistake.

---

## SKU Update Flow

Use this flow only when SKU maintenance is needed.

```text
1. Open WC_Keep_Active
2. Confirm product ID and product name
3. Enter or confirm SKU
4. Set WC Update Action = UPDATE_SKU
5. Run updateWooSkuFromKeepActive()
6. Run exportWooProductsToSheet()
7. Confirm SKU in Woo_Products
```

Current result:

```text
SKU registered: 145
SKU blank: 0
SKU phase: completed
```

---

## Price and Stock Update Flow

Use this flow for WooCommerce price and stock updates.

```text
1. Open WC_Keep_Active
2. Enter New Price
3. Enter New Stock Status
4. Enter New Stock Quantity
5. Set WC Update Action
6. Run previewWooProductsUpdateFromKeepActive()
7. Confirm warnings are 0
8. Run updateWooProductsFromKeepActive()
9. Run exportWooProductsToSheet()
10. Confirm result in Woo_Products
```

---

## Price and Stock Input Rules

### Update price and stock together

```text
WC Update Action = UPDATE
New Price = target price
New Stock Status = instock or outofstock
New Stock Quantity = 1 or 0
```

### Update price only

```text
WC Update Action = UPDATE_PRICE
New Price = target price
```

### Update stock only

```text
WC Update Action = UPDATE_STOCK
New Stock Status = instock or outofstock
New Stock Quantity = 1 or 0
```

### Update price and stock explicitly

```text
WC Update Action = UPDATE_PRICE_STOCK
New Price = target price
New Stock Status = instock or outofstock
New Stock Quantity = 1 or 0
```

---

## Stock Status Rules

For available stock:

```text
New Stock Status = instock
New Stock Quantity = 1
```

For out of stock:

```text
New Stock Status = outofstock
New Stock Quantity = 0
```

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

Production update must remain semi-automatic.

Required safety rules:

* Always preview before production update
* Confirm warning count is 0
* Confirm target row count is expected
* Update only rows where a human entered `WC Update Action`
* Do not update all rows automatically
* Clear `WC Update Action` after successful update
* Start real operation with 5 to 10 rows
* Do not run 100-row bulk update at the beginning
* Use `Woo_Products` to confirm result after update

---

## Standard Operation Checklist

Before production update:

```text
□ Editing WC_Keep_Active, not Woo_Products
□ Product ID is correct
□ SKU is correct
□ New Price is correct
□ New Stock Status is correct
□ New Stock Quantity is correct
□ WC Update Action is entered
□ Preview has been run
□ Preview warning count is 0
□ Preview target count is expected
```

After production update:

```text
□ Production update completed
□ Error count is 0
□ WC Update Action was cleared
□ exportWooProductsToSheet was run
□ Woo_Products confirms the result
```

---

## Confirmed Operation Status

Current confirmed status:

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

## Initial Production Operation Policy

At the beginning of real operation:

```text
Recommended batch size: 5 to 10 rows
Avoid: 100-row bulk update
Operation style: semi-automatic
Human confirmation: required
```

---

## Do Not Add Dangerous Automation

Do not add functions that:

* Automatically update all WooCommerce products without review
* Automatically decide price without human confirmation
* Automatically change stock for all products
* Mix eBay data into WooCommerce update decisions
* Expose secrets in logs
* Skip preview before production update

---

## Repository Separation

WooCommerce automation and eBay automation must remain separate.

WooCommerce repository:

```text
watch-woocommerce-automation
```

eBay repository:

```text
watch-ebay-automation
```

Do not merge these workflows.
