var WOO_YOUTUBE_DEFAULT_CHANNEL_ID = 'UCo7Tl0ZuK9oAnZJHgM8RzEQ';
var WOO_YOUTUBE_MATCH_SHEET_NAME = 'Woo_YouTube_Video_Matches';
var WOO_YOUTUBE_MANUAL_SHEET_NAME = 'YouTube_Videos_Manual';
var WOO_YOUTUBE_MAX_API_RESULTS = 50;
var WOO_YOUTUBE_MAX_EMBED_UPDATES = 10;
var WOO_YOUTUBE_READY_ACTION = 'READY_TO_EMBED';

var WOO_YOUTUBE_MATCH_HEADERS = [
  'Date',
  'Model',
  'Match Status',
  'Woo Product ID',
  'Woo SKU',
  'Woo Product Name',
  'Woo Status',
  'Woo Permalink',
  'YouTube Video ID',
  'YouTube Title',
  'YouTube URL',
  'Published At',
  'Existing Video Embedded',
  'Action',
  'Notes'
];

/**
 * Dry run: fetches YouTube videos from YouTube Data API v3 and writes Woo match results.
 * This function never updates WooCommerce products.
 */
function dryRunMatchYouTubeVideosToWooProducts() {
  var videos = fetchYouTubeChannelVideos_({ maxResults: WOO_YOUTUBE_MAX_API_RESULTS });
  return dryRunMatchYouTubeVideoListToWooProducts_(videos, 'YouTube Data API');
}

/**
 * Dry run: reads videos from YouTube_Videos_Manual and writes Woo match results.
 * This function never updates WooCommerce products.
 */
function dryRunMatchManualYouTubeVideosToWooProducts() {
  var videos = readManualYouTubeVideos_();
  return dryRunMatchYouTubeVideoListToWooProducts_(videos, 'manual sheet');
}

/**
 * Production embed step. Only READY_TO_EMBED rows from the dry-run sheet are processed.
 */
function embedMatchedYouTubeVideosToWooProducts() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(WOO_YOUTUBE_MATCH_SHEET_NAME);
  if (!sheet) {
    throw new Error('Dry run sheet not found: ' + WOO_YOUTUBE_MATCH_SHEET_NAME);
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) {
    Logger.log('No YouTube video match rows to process. Run dryRunMatchYouTubeVideosToWooProducts first.');
    return { checkedRows: 0, updatedRows: 0, skippedRows: 0, errorRows: 0 };
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var columns = getRequiredColumnIndexes_(headers, WOO_YOUTUBE_MATCH_HEADERS);
  var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var checkedRows = 0;
  var updatedRows = 0;
  var skippedRows = 0;
  var errorRows = 0;

  rows.forEach(function(row, index) {
    if (updatedRows >= WOO_YOUTUBE_MAX_EMBED_UPDATES) {
      return;
    }

    var action = trimString_(row[columns.Action]);
    if (action !== WOO_YOUTUBE_READY_ACTION) {
      return;
    }

    checkedRows += 1;
    var sheetRow = index + 2;
    var productId = row[columns['Woo Product ID']];
    var videoId = trimString_(row[columns['YouTube Video ID']]);

    try {
      if (!productId || !videoId) {
        skippedRows += 1;
        sheet.getRange(sheetRow, columns.Notes + 1).setValue('Skipped: missing product ID or video ID.');
        return;
      }

      var product = fetchWooCommerceProduct(productId);
      var currentDescription = String(product.description || '');
      if (hasYouTubeVideoEmbedded_(currentDescription, videoId)) {
        skippedRows += 1;
        sheet.getRange(sheetRow, columns['Existing Video Embedded'] + 1).setValue('YES');
        sheet.getRange(sheetRow, columns.Action + 1).setValue('ALREADY_EMBEDDED');
        sheet.getRange(sheetRow, columns.Notes + 1).setValue('Skipped: video already embedded.');
        Logger.log('Skipped already embedded. Product ID: ' + productId + ' Video ID: ' + videoId);
        return;
      }

      var newDescription = appendYouTubeVideoEmbedHtml_(currentDescription, videoId);
      updateWooCommerceProduct(productId, { description: newDescription });

      updatedRows += 1;
      sheet.getRange(sheetRow, columns['Existing Video Embedded'] + 1).setValue('YES');
      sheet.getRange(sheetRow, columns.Action + 1).setValue('EMBEDDED');
      sheet.getRange(sheetRow, columns.Notes + 1).setValue('Embedded successfully. Confirm product page and run exportWooProductsToSheet().');
      Logger.log('Embedded YouTube video. Product ID: ' + productId + ' Video ID: ' + videoId + ' Description length: ' + currentDescription.length + ' -> ' + newDescription.length);
    } catch (error) {
      errorRows += 1;
      sheet.getRange(sheetRow, columns.Notes + 1).setValue('ERROR: Product ID ' + productId + ' / Video ID ' + videoId + ' / ' + error.message);
      Logger.log('Embed error. Product ID: ' + productId + ' Video ID: ' + videoId + ' Error: ' + error.message);
    }
  });

  Logger.log('YouTube video embed completed. Checked: ' + checkedRows + ' Updated: ' + updatedRows + ' Skipped: ' + skippedRows + ' Errors: ' + errorRows + ' Max per run: ' + WOO_YOUTUBE_MAX_EMBED_UPDATES);
  return { checkedRows: checkedRows, updatedRows: updatedRows, skippedRows: skippedRows, errorRows: errorRows };
}

function fetchYouTubeChannelVideos_(options) {
  var props = PropertiesService.getScriptProperties();
  var apiKey = trimString_(props.getProperty('YOUTUBE_API_KEY'));
  var channelId = trimString_(props.getProperty('YOUTUBE_CHANNEL_ID')) || WOO_YOUTUBE_DEFAULT_CHANNEL_ID;
  assertRequiredValue_(apiKey, 'YOUTUBE_API_KEY');
  assertRequiredValue_(channelId, 'YOUTUBE_CHANNEL_ID');

  var maxResults = Math.min(Number(options && options.maxResults) || WOO_YOUTUBE_MAX_API_RESULTS, 50);
  var url = buildUrl_('https://www.googleapis.com/youtube/v3/search', {
    key: apiKey,
    channelId: channelId,
    part: 'snippet',
    type: 'video',
    order: 'date',
    maxResults: maxResults
  });

  var response = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
  var status = response.getResponseCode();
  var body = response.getContentText();
  if (status < 200 || status >= 300) {
    throw new Error('YouTube Data API request failed: HTTP ' + status + ' ' + body);
  }

  var json = JSON.parse(body);
  return (json.items || []).map(function(item) {
    var snippet = item.snippet || {};
    var thumbs = snippet.thumbnails || {};
    var thumb = thumbs.medium || thumbs.default || thumbs.high || {};
    var videoId = item.id && item.id.videoId;
    return {
      videoId: videoId,
      title: snippet.title || '',
      description: snippet.description || '',
      publishedAt: snippet.publishedAt || '',
      videoUrl: 'https://www.youtube.com/watch?v=' + videoId,
      thumbnailUrl: thumb.url || ''
    };
  }).filter(function(video) {
    return !!video.videoId;
  });
}

function readManualYouTubeVideos_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(WOO_YOUTUBE_MANUAL_SHEET_NAME);
  if (!sheet) {
    throw new Error('Manual YouTube sheet not found: ' + WOO_YOUTUBE_MANUAL_SHEET_NAME);
  }

  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  var headers = values[0];
  var columns = getRequiredColumnIndexes_(headers, ['Video ID', 'Title', 'Description', 'URL', 'Published At']);
  return values.slice(1).map(function(row) {
    var videoId = trimString_(row[columns['Video ID']]);
    return {
      videoId: videoId,
      title: row[columns.Title] || '',
      description: row[columns.Description] || '',
      publishedAt: row[columns['Published At']] || '',
      videoUrl: row[columns.URL] || (videoId ? 'https://www.youtube.com/watch?v=' + videoId : ''),
      thumbnailUrl: ''
    };
  }).filter(function(video) {
    return !!video.videoId || !!video.title || !!video.description;
  });
}

function dryRunMatchYouTubeVideoListToWooProducts_(videos, sourceLabel) {
  var products = fetchWooProductsForYouTubeMatching_();
  var rows = [];
  var stats = { videosScanned: videos.length, modelsExtracted: 0, wooMatches: 0, readyToEmbed: 0, alreadyEmbedded: 0, noWooProduct: 0 };

  videos.forEach(function(video) {
    var models = extractWatchModelNumbersFromText_([video.title, video.description].join(' '));
    stats.modelsExtracted += models.length;

    if (models.length === 0) {
      rows.push(buildYouTubeMatchRow_(video, '', null, 'NO_MODEL_FOUND', 'NO_MODEL_FOUND', false, sourceLabel + ': no watch model number found.'));
      return;
    }

    models.forEach(function(model) {
      var product = findWooProductInListBySkuOrModel_(products, model);
      if (!product) {
        stats.noWooProduct += 1;
        rows.push(buildYouTubeMatchRow_(video, model, null, 'NO_WOO_PRODUCT', 'NO_WOO_PRODUCT', false, 'No WooCommerce product matched this model.'));
        return;
      }

      stats.wooMatches += 1;
      var embedded = hasYouTubeVideoEmbedded_(product.description || '', video.videoId);
      var action = embedded ? 'ALREADY_EMBEDDED' : (models.length > 1 ? 'MULTIPLE_MODEL_CANDIDATES' : WOO_YOUTUBE_READY_ACTION);
      if (embedded) stats.alreadyEmbedded += 1;
      if (action === WOO_YOUTUBE_READY_ACTION) stats.readyToEmbed += 1;

      rows.push(buildYouTubeMatchRow_(video, model, product, embedded ? 'MATCHED_ALREADY_EMBEDDED' : 'MATCHED', action, embedded, models.length > 1 ? 'Multiple model candidates in one video. Human review required before embedding.' : 'Matched by SKU/model.'));
    });
  });

  writeYouTubeMatchRows_(rows);
  Logger.log('YouTube video match dry run completed.');
  Logger.log('Videos scanned: ' + stats.videosScanned);
  Logger.log('Models extracted: ' + stats.modelsExtracted);
  Logger.log('Woo matches: ' + stats.wooMatches);
  Logger.log('Ready to embed: ' + stats.readyToEmbed);
  Logger.log('Already embedded: ' + stats.alreadyEmbedded);
  Logger.log('No Woo product: ' + stats.noWooProduct);
  return stats;
}

function fetchWooProductsForYouTubeMatching_() {
  var products = [];
  ['publish', 'draft', 'pending'].forEach(function(status) {
    var page = 1;
    while (true) {
      var batch = fetchWooCommerceProducts({ status: status, per_page: 100, page: page });
      if (!batch || batch.length === 0) break;
      products = products.concat(batch);
      if (batch.length < 100) break;
      page += 1;
    }
  });
  return products;
}

function findWooProductInListBySkuOrModel_(products, model) {
  var target = normalizeWooModelText_(model);
  for (var i = 0; i < products.length; i++) {
    var product = products[i];
    var values = [product.sku, product.name, product.slug];
    (product.meta_data || []).forEach(function(meta) {
      if (normalizeWooModelText_(meta.key) === 'MODEL') values.push(meta.value);
    });
    for (var j = 0; j < values.length; j++) {
      if (normalizeWooModelText_(values[j]) === target) return product;
    }
  }
  return null;
}

function extractWatchModelNumbersFromText_(text) {
  var source = String(text || '').toUpperCase();
  var patterns = [
    /\b[A-Z]{2,5}-[A-Z0-9]{2,10}-[A-Z0-9]{1,6}\b/g,
    /\b[A-Z]{2,5}-[A-Z0-9]{4,12}\b/g,
    /\b[A-Z]{2,6}[0-9]{3,6}[A-Z0-9-]*\b/g,
    /\bRN-[A-Z0-9]{2,10}\b/g,
    /\b(?:OCW|GW|DW|GA|GM|BGD|LCW|WVA|PRW|PRG)-[A-Z0-9-]{4,16}\b/g
  ];
  var noise = { WATCH: true, SHORTS: true, VIDEO: true, CASIO: true, SEIKO: true, CITIZEN: true, ORIENT: true, JAPAN: true, JDM: true, NEW: true, UNUSED: true };
  var results = [];

  patterns.forEach(function(pattern) {
    var match;
    while ((match = pattern.exec(source)) !== null) {
      var candidate = match[0].replace(/^-+|-+$/g, '');
      if (!noise[candidate] && candidate.length >= 6 && results.indexOf(candidate) === -1) {
        results.push(candidate);
      }
    }
  });

  return results;
}

function buildYouTubeMatchRow_(video, model, product, matchStatus, action, embedded, notes) {
  return [
    new Date(),
    model,
    matchStatus,
    product ? product.id : '',
    product ? product.sku : '',
    product ? product.name : '',
    product ? product.status : '',
    product ? product.permalink : '',
    video.videoId || '',
    video.title || '',
    video.videoUrl || '',
    video.publishedAt || '',
    embedded ? 'YES' : 'NO',
    action,
    notes || ''
  ];
}

function writeYouTubeMatchRows_(rows) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(WOO_YOUTUBE_MATCH_SHEET_NAME) || ss.insertSheet(WOO_YOUTUBE_MATCH_SHEET_NAME);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, WOO_YOUTUBE_MATCH_HEADERS.length).setValues([WOO_YOUTUBE_MATCH_HEADERS]);
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, WOO_YOUTUBE_MATCH_HEADERS.length).setValues(rows);
  }
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, WOO_YOUTUBE_MATCH_HEADERS.length);
}

function hasYouTubeVideoEmbedded_(description, videoId) {
  var escapedVideoId = String(videoId || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escapedVideoId) return false;
  var patterns = [
    new RegExp('youtube\\.com/embed/' + escapedVideoId, 'i'),
    new RegExp('youtu\\.be/' + escapedVideoId, 'i'),
    new RegExp('data-youtube-video-id=["\\\']' + escapedVideoId + '["\\\']', 'i')
  ];
  return patterns.some(function(pattern) {
    return pattern.test(String(description || ''));
  });
}

function appendYouTubeVideoEmbedHtml_(description, videoId) {
  if (hasYouTubeVideoEmbedded_(description, videoId)) return description;
  return String(description || '') + '\n\n' + buildYouTubeVideoEmbedHtml_(videoId);
}

function buildYouTubeVideoEmbedHtml_(videoId) {
  var safeVideoId = String(videoId || '').replace(/[^A-Za-z0-9_-]/g, '');
  assertRequiredValue_(safeVideoId, 'videoId');
  return [
    '<hr>',
    '<h2>Product Video</h2>',
    '<p>Please watch the video below to see more details about this model.</p>',
    '<div class="watch-tokyo-youtube-video" data-youtube-video-id="' + safeVideoId + '">',
    '  <iframe',
    '    width="560"',
    '    height="315"',
    '    src="https://www.youtube.com/embed/' + safeVideoId + '"',
    '    title="YouTube video player"',
    '    frameborder="0"',
    '    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"',
    '    allowfullscreen>',
    '  </iframe>',
    '</div>'
  ].join('\n');
}
