# Repository Boundary / リポジトリ境界

この文書は `watch-woocommerce-automation` と `watch-ebay-automation` の責務を分離し、WooCommerce / WDB 専用リポジトリに eBay 運用コードを混在させないための境界ルールです。

## Scope Table / 担当範囲

| Repository |担当範囲 / Scope | 許可される作業 / Allowed work | 禁止 / Forbidden |
| --- | --- | --- | --- |
| `watch-woocommerce-automation` | WooCommerce / Woo Draft Bridge（WDB）専用。`watch-tokyo.com` の商品同期、ドラフト候補、商品改善候補を扱う。 | WooCommerce product sync, Woo Draft Bridge / WDB, Woo draft candidate generation, Woo product improvement candidates, Woo API product read/create/update logic, `watch-tokyo.com` product draft workflow. | eBay seller operations, eBay Active_listing, eBay Listing_plan, Price_Up_Candidates, Sell Similar, eBay Trading API, eBay Revise Price, Ebay_New_Listing_Candidates, Ebay_Restock_Candidates. |
| `watch-ebay-automation` | eBay出品・価格改定・販売運用専用。 | eBay Active Listing, Listing Plan, price revision, Sell Similar, eBay Trading API, eBay seller sheet automation. | WooCommerce production product updates or WDB-only draft workflows that belong in this repository. |

## Forbidden Mixed Examples / 禁止される混在例

| Mixed request or code | Why forbidden | Correct destination |
| --- | --- | --- |
| Add `Active_listing` fetch logic to this repository. | It is eBay seller operation logic, not WooCommerce / WDB. | `watch-ebay-automation` |
| Build `Listing_plan` or `Listing_plan_Candidate` from this repository. | Listing plan generation is eBay listing management. | `watch-ebay-automation` |
| Add `Price_Up_Candidates` or `Revise Price` logic here. | eBay price revision is outside WooCommerce / WDB scope. | `watch-ebay-automation` |
| Add `Sell Similar` candidate generation here. | Sell Similar is eBay listing workflow. | `watch-ebay-automation` |
| Add eBay Trading API credentials or token refresh code here. | This repository must not contain eBay external API operation code. | `watch-ebay-automation` |
| Use Woo product update rows to trigger eBay listing changes. | Cross-platform automatic operation breaks the repository boundary and review model. | Split the work by repository. |

## One-line Template for Codex Requests / Codex依頼時の1行目テンプレ

| Destination | First line template |
| --- | --- |
| WooCommerce / WDB work | `作業対象は watch-woocommerce-automation です。WooCommerce / WDB 専用作業として進めてください。` |
| eBay seller work | `作業対象は watch-ebay-automation です。eBay運用専用作業として進めてください。` |

## Woo Naming Rules / Woo側の命名ルール

既存シート名・既存関数名は今回変更しません。新規追加や将来整理が必要な場合のみ、以下の Woo 側命名を推奨します。

### Recommended file names

* `woo_products_sync.gs`
* `woo_wdb_bridge.gs`
* `woo_draft_builder.gs`
* `woo_next_sales_candidates.gs`
* `woo_product_improvement.gs`

### Recommended sheet names

* `WOO_Products`
* `WOO_Draft_Candidates`
* `WOO_WDB_Candidates`
* `WOO_Next_Sales_Candidates`
* `WOO_Product_Improvement`

### Compatibility note

現在の本番運用で使われている既存名（例: `Woo_Products`, `WC_Keep_Active`）は、既存機能を壊さないため維持します。リネームは別途、移行手順・検証手順・ロールバック手順を用意したうえで実施してください。
