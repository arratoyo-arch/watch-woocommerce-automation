# Watch Tokyo Store Audit and Customer-Friendly Improvement Plan

## Scope and safety policy

This audit focuses only on WooCommerce and Woo Draft Bridge operations for `watch-tokyo.com`.

The recommended approach is:

* semi-automatic
* human-reviewed
* preview-before-production
* selected-rows-only
* draft-first, with no automatic publishing

This document does not propose automatic public product updates, fixed-page API updates, pricing automation, order handling, or secrets handling changes.

## Current issues

### 1. First impression on the home page

Overseas customers should understand within a few seconds that Watch Tokyo sells authentic Japanese watches shipped from Japan. The site should make these points visible above the fold:

* Japanese watches and Japan domestic models
* Authentic products sourced from Japan
* Free international shipping from Japan
* Tracking and careful packing
* Clear contact path before ordering

If these messages are scattered across product descriptions only, new visitors may not immediately understand why the store is trustworthy.

### 2. Store message clarity

The store should avoid wording that sounds too promotional, too luxury-oriented, or unclear about buyer responsibilities. A reliable specialist tone is better than a high-pressure sales tone.

Recommended core message:

> Authentic Japanese watches, carefully sourced and shipped internationally from Japan.

Important supporting notes:

* New / unused condition should be stated on product pages when applicable.
* Shipping should be described as international shipping from Japan with tracking.
* Customs and import duties should be clearly shown as buyer responsibility where applicable.
* Buyers should be asked to check model number, specifications, size, color, functions, and compatibility before purchase.

### 3. Category structure

The store should support three browsing patterns:

1. Customers who know the brand.
2. Customers who know the series.
3. Customers who know the use case or feature.

Recommended category groups:

#### Brand

* Casio
* Seiko
* Citizen
* Orient

#### Series

* G-SHOCK
* Lineage
* Oceanus
* Wave Ceptor
* Seiko Selection
* Prospex
* Presage
* Promaster
* Attesa
* Orient Star

#### Use case / feature

* Solar Watches
* Radio Controlled Watches
* Digital Watches
* Diver Style Watches
* Everyday Watches
* Japan Domestic Models
* New Arrivals

Keep the category hierarchy simple enough that draft products can be assigned manually and reviewed before publication.

### 4. Product page structure

A customer-friendly product page should answer the buyer's practical questions quickly.

Recommended order:

1. Clear SEO-friendly product title
2. Short description with model, condition, JDM note, and shipping note
3. Key features
4. Condition
5. Shipping
6. Customs / import duties
7. Before purchase note
8. Human review note while draft

The product page should avoid overclaiming specifications if the exact details have not been confirmed. When specifications are incomplete, the copy should tell the buyer to verify the model number and ask questions before ordering.

### 5. Trust navigation

The following pages or footer links should be easy to find:

* About us
* Shipping policy
* Customs / import duties
* Returns / refunds
* Contact
* Authenticity / sourcing from Japan
* FAQ

These can be implemented manually in WordPress first. This repository should not automatically update top-page or fixed-page content in the current phase.

### 6. Purchase path

Recommended flow:

1. Home page explains the store and trust points.
2. Visitors choose Shop by Brand, Shop by Category, New Arrivals, or Featured JDM Watches.
3. Product pages show model-specific information, condition, shipping, customs, and before-purchase notes.
4. Customers add to cart after checking model number and compatibility.

Draft products created by WDB should appear in the appropriate brand, series, and feature categories after manual review and publication.

### 7. WDB alignment

WDB draft payloads should produce product pages that match the store structure:

* Title should include brand, series, model, important feature, and Japan model wording where natural.
* Short description should be concise and confidence-building.
* Description should be sectioned and easy to scan.
* Categories should support brand, series, and use-case browsing.
* Tags should reinforce model, JDM, ships from Japan, free shipping, and new / unused condition.
* Metadata should preserve a publish checklist for manual review.

## Priority plan

### Priority 1: Documentation and message alignment

* Create the store audit and homepage proposal documents.
* Create reusable English copy templates.
* Keep README operational notes aligned with the docs.

### Priority 2: Draft product copy improvements

* Improve `buildWooCustomerFriendlyDraftPayload_()` output only.
* Keep all products as `status: draft`.
* Keep duplicate checks and create helpers unchanged.
* Do not update live top-page or fixed-page content through API.

### Priority 3: Manual site updates outside this PR

* Add or improve About / Shipping / Customs / Returns / FAQ / Contact pages manually in WordPress.
* Add homepage sections manually after reviewing copy.
* Review 5 to 10 draft products first before larger operation.

## Recommended publish checklist

Before publishing a WDB-created draft, confirm:

* Product is still needed and not duplicated.
* Model number is correct.
* Brand and series are correct.
* Product title reads naturally in English.
* Price and stock are correct.
* Images are accurate and complete.
* Category and tags are appropriate.
* Condition is correct.
* Shipping note is correct.
* Customs note is present.
* Specifications, size, color, functions, and compatibility are checked.
* Customer can contact the store before ordering.
* No secret values or internal-only notes are present.
