# watch-woocommerce-automation

WooCommerce automation for watch-tokyo.com.

This repository is for WooCommerce only.  
Do not mix eBay automation, eBay API, eBay listing logic, or eBay sales logic into this repository.

## Purpose

This project manages WooCommerce product update workflow using Google Apps Script and Google Sheets.

Main goals:

- Extract WooCommerce product candidates from `WC_Products`
- Review and prepare updates in `WC_Keep_Active`
- Update WooCommerce products safely by using `WC Update Action = UPDATE`
- Keep API keys and secrets outside source code
- Keep WooCommerce automation separated from eBay automation

## Important Safety Rules

Do not write secrets directly in source code or README.

Never commit:

- WooCommerce Consumer Key actual value
- WooCommerce Consumer Secret actual value
- Access token
- Refresh token
- Password
- Private API keys

Use Google Apps Script Properties instead.

Allowed property names:

- `WC_SITE_URL`
- `WC_CONSUMER_KEY`
- `WC_CONSUMER_SECRET`

## Main Sheets

### WC_Products

Source product list from WooCommerce.

### WC_Keep_Active

Main working sheet for product update candidates.

Important columns:

- `ID`
- `SKU`
- `Name`
- `Price`
- `Regular Price`
- `Stock Status`
- `Stock Quantity`
- `WC Update Action`
- `New Price`
- `New Stock Status`
- `New Stock Quantity`
- `WC Sync Status`
- `WC Synced At`
- `WC Sync Error`

### WC_Todo_Check

Optional support sheet for manual review.  
This sheet is useful for checking products, but the priority logic may be improved later.

## Operation Flow

### A. Update or prepare WC_Products

Refresh or prepare WooCommerce product data in `WC_Products`.

### B. Build update candidates

Run:

```javascript
buildWooKeepActiveCandidates()
