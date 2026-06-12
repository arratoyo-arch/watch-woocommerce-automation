# watch-woocommerce-automation

WooCommerce専用のGoogle Apps Script自動化リポジトリです。

## Purpose

This project is only for WooCommerce store automation.

## Script Properties

Set these values in Google Apps Script project properties:

- `WC_SITE_URL`
- `WC_CONSUMER_KEY`
- `WC_CONSUMER_SECRET`

## Files

- `Code.gs` - Entry points for manual runs and scheduled triggers.
- `config.gs` - Reads and validates WooCommerce configuration.
- `woocommerce.gs` - WooCommerce REST API client helpers and product update routine.
- `keep_active.gs` - Lightweight keep-alive/health check routine.
- `utils.gs` - Shared logging, URL, response, and sheet helpers.

## Quick Check

Run `runWooCommerceHealthCheck()` from Apps Script after setting the required Script Properties.

## Main Functions

- `runWooCommerceHealthCheck()`
- `runWooCommerceProductSample()`
- `testFetchWooCommerceProducts()`
- `fetchWooCommerceProducts(params)`
- `fetchWooCommerceProduct(productId)`
- `updateWooCommerceProduct(productId, fields)`
- `updateWooCommerceProductPrice(productId, regularPrice, salePrice)`
- `updateWooCommerceProductStock(productId, stockQuantity, manageStock)`
- `updateWooProductsFromKeepActive()`
- `keepWooCommerceAutomationActive()`

## WC_Keep_Active Product Update Operation

WooCommerceの商品を更新する場合は、対象シート `WC_Keep_Active` の更新したい行だけに以下を入力します。

- T列 `WC Update Action`: `UPDATE`
- U列 `New Price`: 新しい通常価格
- V列 `New Stock Status`: `instock`, `outofstock`, `onbackorder` のいずれか
- W列 `New Stock Quantity`: 新しい在庫数量

入力後、Google Apps Script で `updateWooProductsFromKeepActive()` を実行します。

処理対象になるのは `WC Update Action` が `UPDATE` の行だけです。WooCommerce API の PUT 更新が成功すると、対象行は次のように更新されます。

- `WC Sync Status`: `UPDATED`
- `WC Synced At`: 同期日時
- `WC Sync Error`: 空白
- `WC Update Action`: 空白に自動クリア

誤更新を防ぐため、成功後の `UPDATE` は自動で消えます。エラーになった行は `WC Sync Status` が `ERROR` になり、`WC Sync Error` に内容が記録されます。
