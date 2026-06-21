# YouTube video embed workflow for WooCommerce products

## Purpose

This workflow matches watch-tokyo.com WooCommerce products with videos and Shorts from the store YouTube channel. When a video title or description contains a watch model number that matches a WooCommerce product SKU or `model` metadata, a reviewed production function can append a YouTube embed block to the product description.

## Do not scrape YouTube Studio

YouTube Studio URLs are logged-in management pages. This project must not scrape Studio pages from GAS or automation. Use one of these safe inputs instead:

1. YouTube Data API v3 for the public channel video list.
2. `YouTube_Videos_Manual` sheet for manually pasted CSV-style video data.

## Script Properties

Set these values in Google Apps Script Project Settings > Script Properties. Do not write actual secret values in GitHub, README, comments, logs, or test data.

* `YOUTUBE_API_KEY`
* `YOUTUBE_CHANNEL_ID` such as `UCo7Tl0ZuK9oAnZJHgM8RzEQ`
* `WOO_BASE_URL`
* `WOO_CONSUMER_KEY`
* `WOO_CONSUMER_SECRET`

## Dry Run with YouTube Data API

Run:

```javascript
 dryRunMatchYouTubeVideosToWooProducts()
```

The function fetches up to 50 recent videos and Shorts, extracts model numbers from titles and descriptions, compares them with WooCommerce products in `publish`, `draft`, and `pending`, and writes results to `Woo_YouTube_Video_Matches`. It does not update products.

## Manual sheet fallback

If the YouTube API is unavailable, create `YouTube_Videos_Manual` with these columns:

* `Video ID`
* `Title`
* `Description`
* `URL`
* `Published At`

Then run:

```javascript
 dryRunMatchManualYouTubeVideosToWooProducts()
```

## Match result sheet

Dry Run writes `Woo_YouTube_Video_Matches` with these columns:

* `Date`
* `Model`
* `Match Status`
* `Woo Product ID`
* `Woo SKU`
* `Woo Product Name`
* `Woo Status`
* `Woo Permalink`
* `YouTube Video ID`
* `YouTube Title`
* `YouTube URL`
* `Published At`
* `Existing Video Embedded`
* `Action`
* `Notes`

Typical `Action` values:

* `READY_TO_EMBED`: one model matched one WooCommerce product and the same video is not embedded yet.
* `ALREADY_EMBEDDED`: the same video ID already exists in the product description.
* `NO_WOO_PRODUCT`: a model was found but no WooCommerce product matched it.
* `NO_MODEL_FOUND`: no watch model number was found in the video title or description.
* `MULTIPLE_MODEL_CANDIDATES`: multiple model candidates were found and a human must review before embedding.

## Production embed step

After checking the dry-run sheet, run:

```javascript
 embedMatchedYouTubeVideosToWooProducts()
```

Safety rules:

* Only rows with `Action = READY_TO_EMBED` are processed.
* The function updates at most 10 products per execution.
* Product status is not changed and products are never automatically published.
* Existing descriptions are preserved; the video section is appended to the end only.
* The same video ID is not embedded twice.
* The function logs product ID, video ID, update counts, and per-row errors.
* After successful production updates, run `exportWooProductsToSheet()` and confirm results in `Woo_Products`.

## Existing video detection

A product is treated as already embedded when its description contains any of these values for the same video ID:

* `youtube.com/embed/VIDEO_ID`
* `youtu.be/VIDEO_ID`
* `data-youtube-video-id="VIDEO_ID"`

## If no match appears

Check whether the product SKU or `model` metadata exactly contains the model number found in the video title or description. If a video has multiple models, review the row manually before changing the `Action` value.

## Boundaries

This workflow is only for WooCommerce product pages on watch-tokyo.com. It does not add eBay logic, does not update other marketplace listings, does not scrape YouTube Studio, and does not store secrets in the repository.
