---
name: copy-ebay-products-to-woo
description: Copy new-watch product data from the main watch-ebay-automation system into the subordinate watch-woocommerce-automation sales channel without moving, deleting, or changing eBay listings. Use when the user asks to copy, duplicate, or register the current eBay watch catalog in WooCommerce or watch-tokyo.com, including requests mentioning about 500 Active listings. Keep eBay as the source of truth, keep Active_listing read-only, deduplicate by normalized model, exclude existing Woo products and drafts, and require reviewed small-batch draft creation.
---

# Copy eBay Products to WooCommerce

Treat this as a copy of product data, never a repository replacement or transfer of listings. Preserve eBay listings and both repositories.

## System hierarchy

- Treat `watch-ebay-automation` as the main system and source of truth for product selection, active-listing state, inventory review, pricing judgment, and sales decisions.
- Treat `watch-woocommerce-automation` as a subordinate sales channel that receives reviewed copies of eligible product data.
- Never let WooCommerce data override, replace, or become the authoritative source for eBay operations.
- When using ChatGPT Work with both folders, keep `watch-ebay-automation` as the primary project folder and attach `watch-woocommerce-automation` as the secondary folder.

## Boundaries

- Read `Active_listing` only from the current trusted source. Never write to it.
- Never call eBay write APIs or change listings, price, quantity, promotion, status, or inventory.
- Never copy eBay implementation code into `watch-woocommerce-automation`.
- Keep WooCommerce implementation in `watch-woocommerce-automation` and eBay implementation in `watch-ebay-automation`.
- Never expose credentials or store secrets in source, output, logs, or prompts.
- Default to preview-only. Do not create or update WooCommerce products unless the user explicitly requests that production step after reviewing a preview.
- Create WooCommerce products as `draft`; never publish automatically.

## Workflow

1. Refresh the latest repository instructions and current source state. Read the applicable `AGENTS.md` and operational documentation before acting.
2. Read the latest `Active_listing` without mutation and report its acquisition time and row count.
3. Restrict candidates to new CASIO, CITIZEN, ORIENT, and SEIKO wristwatches unless the user explicitly changes the brand scope. Exclude used goods, parts, bands, accessories, and rows with no defensible model number.
4. Normalize model comparison keys with Unicode NFKC, uppercase letters, and removal of whitespace and common hyphen variants. Retain every letter, digit, suffix, color, and domestic/overseas reference. Preserve a preferred display form.
5. Deduplicate the source by comparison key and keep source-row traceability.
6. Retrieve current WooCommerce products read-only and match against `publish`, `draft`, and `pending` by normalized SKU, model, and product name evidence. Exclude every already-existing model from new-draft candidates.
7. Produce a complete preview/accounting report before any write: source rows; valid new-watch rows; unique models; existing WooCommerce models by status; new-draft candidates; duplicates, invalid models, missing images, missing prices, and unresolved rows.
8. Keep incomplete or conflicting rows in human review. Do not infer missing product facts.
9. For a production request, process only human-selected rows after a clean dry run. Limit the initial real batch to 5 rows and later batches to at most 10 rows.
10. Before each production batch, verify zero warnings/errors, expected targets, duplicate protection, valid price, stock policy, description, category, tags, and image readiness.
11. Create drafts only. Re-fetch WooCommerce products after creation and reconcile every requested row as created, skipped-existing, failed, or unresolved. Stop on any accounting mismatch.

## Required WooCommerce content

Prepare Model/SKU, Brand, Product name, Price, Stock, Description, Images, Categories, Tags, Condition, and Shipping. State new/unused, Japan domestic model/JDM when evidenced, authentic sourcing from Japan, international shipping terms, customs responsibility, and a human-review note. Do not fabricate specifications or image ownership.

## Stop conditions

Stop without writes when repository identity or instructions conflict; the source date, schema, or row count is unclear; WooCommerce identity cannot be verified; retrieval is partial; normalized matching is ambiguous; an existing product may duplicate a candidate; the worktree has conflicting changes; preview has warnings/errors; a requested batch exceeds 10; an API error or timeout occurs; or a publish operation would be required.

## Reporting

Lead with whether the requested stage is ready. Distinguish source extraction, candidate preparation, dry run, draft creation, and publication as separate approvals. State exact counts, exclusions, unresolved items, batch size, and all systems changed or unchanged. Never claim all roughly 500 items were copied unless post-write reconciliation proves every item-level outcome.
