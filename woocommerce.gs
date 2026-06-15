/**
 * Calls the WooCommerce REST API.
 */
function callWooCommerceApi_(path, params, method, payload) {
  var config = getWooCommerceConfig();
  var query = {};
  var sourceParams = params || {};
  Object.keys(sourceParams).forEach(function(key) {
    query[key] = sourceParams[key];
  });
  query.consumer_key = config.consumerKey;
  query.consumer_secret = config.consumerSecret;

  var url = buildUrl_(config.siteUrl + '/wp-json/wc/v3/' + trimSlashes_(path), query);
  var options = {
    method: method || 'get',
    muteHttpExceptions: true,
    headers: {
      Accept: 'application/json'
    }
  };

  if (payload) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(payload);
  }

  var response = UrlFetchApp.fetch(url, options);
  return parseWooCommerceResponse_(response);
}

/**
 * Returns a small product list from WooCommerce.
 */
function fetchWooCommerceProducts(params) {
  return callWooCommerceApi_('products', params || {}, 'get');
}

/**
 * Returns one WooCommerce product by product ID.
 */
function fetchWooCommerceProduct(productId) {
  assertRequiredValue_(productId, 'productId');
  return callWooCommerceApi_('products/' + encodeURIComponent(productId), {}, 'get');
}

/**
 * Updates a WooCommerce product with the given fields.
 */
function updateWooCommerceProduct(productId, fields) {
  assertRequiredValue_(productId, 'productId');
  if (!fields || Object.keys(fields).length === 0) {
    throw new Error('fields is required.');
  }

  return callWooCommerceApi_('products/' + encodeURIComponent(productId), {}, 'put', fields);
}

/**
 * Updates regular and optional sale price for a WooCommerce product.
 */
function updateWooCommerceProductPrice(productId, regularPrice, salePrice) {
  assertRequiredValue_(productId, 'productId');
  assertRequiredValue_(regularPrice, 'regularPrice');

  var payload = {
    regular_price: String(regularPrice)
  };

  if (salePrice !== undefined && salePrice !== null && salePrice !== '') {
    payload.sale_price = String(salePrice);
  }

  return updateWooCommerceProduct(productId, payload);
}

/**
 * Updates stock quantity for a WooCommerce product.
 */
function updateWooCommerceProductStock(productId, stockQuantity, manageStock) {
  assertRequiredValue_(productId, 'productId');
  assertRequiredValue_(stockQuantity, 'stockQuantity');

  return updateWooCommerceProduct(productId, {
    manage_stock: manageStock === false ? false : true,
    stock_quantity: Number(stockQuantity),
    stock_status: Number(stockQuantity) > 0 ? 'instock' : 'outofstock'
  });
}

var WC_KEEP_ACTIVE_SHEET_NAME = 'WC_Keep_Active';
var WC_KEEP_ACTIVE_HEADERS = {
  productId: 'ID',
  updateAction: 'WC Update Action',
  newPrice: 'New Price',
  newStockStatus: 'New Stock Status',
  newStockQuantity: 'New Stock Quantity',
  syncStatus: 'WC Sync Status',
  syncedAt: 'WC Synced At',
  syncError: 'WC Sync Error'
};
var WC_KEEP_ACTIVE_UPDATE_ACTION = 'UPDATE';

/**
 * Updates WooCommerce products for rows marked UPDATE in WC_Keep_Active.
 */
function updateWooProductsFromKeepActive() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(WC_KEEP_ACTIVE_SHEET_NAME);
  if (!sheet) {
    throw new Error('Sheet not found: ' + WC_KEEP_ACTIVE_SHEET_NAME);
  }

  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) {
    logInfo_('No WC_Keep_Active rows to update.');
    return { checkedRows: 0, updatedRows: 0, errorRows: 0 };
  }

  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var columns = getRequiredColumnIndexes_(headers, Object.keys(WC_KEEP_ACTIVE_HEADERS).map(function(key) {
    return WC_KEEP_ACTIVE_HEADERS[key];
  }));
  var rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  var now = new Date();
  var checkedRows = 0;
  var updatedRows = 0;
  var errorRows = 0;

  rows.forEach(function(row, rowIndex) {
    var sheetRow = rowIndex + 2;
    var action = trimString_(row[columns[WC_KEEP_ACTIVE_HEADERS.updateAction]]);
    if (action.toUpperCase() !== WC_KEEP_ACTIVE_UPDATE_ACTION) {
      return;
    }

    checkedRows += 1;

    try {
      var productId = row[columns[WC_KEEP_ACTIVE_HEADERS.productId]];
      var payload = buildWooKeepActiveUpdatePayload_(row, columns);
      updateWooCommerceProduct(productId, payload);

      sheet.getRange(sheetRow, columns[WC_KEEP_ACTIVE_HEADERS.syncStatus] + 1).setValue('UPDATED');
      sheet.getRange(sheetRow, columns[WC_KEEP_ACTIVE_HEADERS.syncedAt] + 1).setValue(now);
      sheet.getRange(sheetRow, columns[WC_KEEP_ACTIVE_HEADERS.syncError] + 1).clearContent();
      sheet.getRange(sheetRow, columns[WC_KEEP_ACTIVE_HEADERS.updateAction] + 1).clearContent();
      updatedRows += 1;
    } catch (error) {
      sheet.getRange(sheetRow, columns[WC_KEEP_ACTIVE_HEADERS.syncStatus] + 1).setValue('ERROR');
      sheet.getRange(sheetRow, columns[WC_KEEP_ACTIVE_HEADERS.syncError] + 1).setValue(error.message);
      errorRows += 1;
    }
  });

  logInfo_('WC_Keep_Active update completed. checked=' + checkedRows + ', updated=' + updatedRows + ', errors=' + errorRows);
  return { checkedRows: checkedRows, updatedRows: updatedRows, errorRows: errorRows };
}

function buildWooKeepActiveUpdatePayload_(row, columns) {
  var payload = {};
  var price = row[columns[WC_KEEP_ACTIVE_HEADERS.newPrice]];
  var stockStatus = trimString_(row[columns[WC_KEEP_ACTIVE_HEADERS.newStockStatus]]).toLowerCase();
  var stockQuantity = row[columns[WC_KEEP_ACTIVE_HEADERS.newStockQuantity]];

  if (price !== undefined && price !== null && price !== '') {
    payload.regular_price = String(price);
  }
  if (stockStatus) {
    if (['instock', 'outofstock', 'onbackorder'].indexOf(stockStatus) === -1) {
      throw new Error('Invalid New Stock Status: ' + stockStatus);
    }
    payload.stock_status = stockStatus;
  }
  if (stockQuantity !== undefined && stockQuantity !== null && stockQuantity !== '') {
    if (isNaN(Number(stockQuantity))) {
      throw new Error('Invalid New Stock Quantity: ' + stockQuantity);
    }
    payload.manage_stock = true;
    payload.stock_quantity = Number(stockQuantity);
  }
  if (Object.keys(payload).length === 0) {
    throw new Error('No WooCommerce update fields were provided.');
  }

  return payload;
}

/**
 * Confirms that the WooCommerce API credentials can read store metadata.
 */
function checkWooCommerceConnection() {
  var result = callWooCommerceApi_('system_status', {}, 'get');
  logInfo_('WooCommerce connection check completed.');
  return {
    ok: true,
    environment: result.environment || {},
    settings: result.settings || {}
  };
}

var WOO_NEXT_DAY_SOURCE_SHEETS = [
  'Woo_Products',
  'WC_Keep_Active',
  'WC_Todo_Check',
  'WC_Products'
];
var WOO_NEXT_DAY_CANDIDATE_SHEET = 'WDB_Next_Sales_Candidates';
var WOO_LIST_IMPROVEMENT_SHEET = 'WDB_List_Improvement';

/**
 * Builds human-review sheets for next-day sales candidates and listing improvements.
 * This analysis is read-only for WooCommerce products and never updates production data.
 */
function analyzeWooNextDaySalesCandidates() {
  var result = buildWooNextDaySalesCandidates_();
  createWooNextDaySalesCandidateSheet_(result.candidates);
  createWooListImprovementSheet_(result.improvements);

  Logger.log('Woo next-day sales analysis completed.');
  Logger.log('読み込んだシート名: ' + result.loadedSheets.join(', '));
  Logger.log('読み込んだ行数: ' + result.loadedRows);
  Logger.log('候補件数: ' + result.candidates.length);
  Logger.log('改善提案件数: ' + result.improvements.length);
  Logger.log('HIGH 件数: ' + result.priorityCounts.HIGH);
  Logger.log('MEDIUM 件数: ' + result.priorityCounts.MEDIUM);
  Logger.log('LOW 件数: ' + result.priorityCounts.LOW);
  Logger.log('エラー件数: ' + result.errorCount);

  return {
    loadedSheets: result.loadedSheets,
    loadedRows: result.loadedRows,
    candidateCount: result.candidates.length,
    improvementCount: result.improvements.length,
    priorityCounts: result.priorityCounts,
    errorCount: result.errorCount
  };
}

function buildWooNextDaySalesCandidates_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var candidatesByKey = {};
  var improvements = [];
  var loadedSheets = [];
  var loadedRows = 0;
  var priorityCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  var errorCount = 0;

  WOO_NEXT_DAY_SOURCE_SHEETS.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log('読み込み対象シートなし: ' + sheetName + ' をスキップ');
      return;
    }

    loadedSheets.push(sheetName);
    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      Logger.log('データ行なし: ' + sheetName);
      return;
    }

    var headers = values[0].map(function(header) { return String(header || '').trim(); });
    for (var i = 1; i < values.length; i++) {
      try {
        var product = mapWooProductAnalysisRow_(headers, values[i], sheetName);
        if (!product.hasAnyValue) {
          continue;
        }
        loadedRows++;

        var scored = scoreWooNextDaySalesCandidate_(product);
        var key = product.productId || product.sku || product.model || product.name || (sheetName + ':' + i);
        if (!candidatesByKey[key] || scored.score > candidatesByKey[key].score) {
          candidatesByKey[key] = scored;
        }

        judgeWooListImprovement_(product).forEach(function(issue) {
          improvements.push(issue);
          if (priorityCounts[issue.priority] !== undefined) {
            priorityCounts[issue.priority]++;
          }
        });
      } catch (error) {
        errorCount++;
        Logger.log('分析エラー: ' + sheetName + ' row ' + (i + 1) + ' / ' + error.message);
      }
    }
  });

  var candidates = Object.keys(candidatesByKey).map(function(key) { return candidatesByKey[key]; });
  candidates.sort(function(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return String(a.model).localeCompare(String(b.model));
  });
  candidates.forEach(function(candidate, index) {
    candidate.rank = index + 1;
  });

  improvements.sort(function(a, b) {
    var order = { HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (order[a.priority] || 9) - (order[b.priority] || 9);
  });

  return {
    loadedSheets: loadedSheets,
    loadedRows: loadedRows,
    candidates: candidates,
    improvements: improvements,
    priorityCounts: priorityCounts,
    errorCount: errorCount
  };
}

function scoreWooNextDaySalesCandidate_(product) {
  var score = 0;
  var reasons = [];
  var actions = ['WDB候補'];
  var status = String(product.status || '').toLowerCase();
  var stockStatus = String(product.stockStatus || '').toLowerCase();
  var stockQuantity = parseWooNumber_(product.stockQuantity);
  var price = parseWooNumber_(product.price || product.regularPrice);
  var text = [product.sku, product.name, product.categories, product.tags].join(' ');

  if (status === 'publish' || status === 'published') {
    score += 20;
    reasons.push('Publishedで商品化済み');
  } else if (status === 'draft') {
    score += 14;
    actions.push('Draft確認', 'Publish候補');
    reasons.push('Draftで商品化しやすい');
  }

  if (stockStatus === 'instock' || stockQuantity >= 1) {
    score += 18;
    reasons.push('在庫あり');
  } else if (stockStatus === 'outofstock') {
    score -= 10;
    actions.push('Restock候補');
    reasons.push('outofstockのためRestock候補');
  }

  if (price >= 100 && price <= 250) {
    score += 18;
    reasons.push('100〜250 USDの普及価格帯');
  } else if (price > 250 && price <= 300) {
    score += 8;
    actions.push('価格確認');
    reasons.push('180〜300 USD帯は利益重視で確認');
  } else if (!price) {
    actions.push('価格確認');
    reasons.push('価格空欄');
  }

  var brandSeries = detectWooBrandSeries_(text);
  if (brandSeries.brand !== '要確認') {
    score += 12;
    reasons.push('優先ブランド: ' + brandSeries.brand);
  }
  if (brandSeries.keywordScore > 0) {
    score += brandSeries.keywordScore;
    reasons.push('需要キーワードあり');
  }
  if (product.model !== '要確認') {
    score += 12;
    reasons.push('モデル番号が明確');
  }

  var improvements = judgeWooListImprovement_(product);
  if (improvements.length > 0) {
    score -= Math.min(improvements.length * 3, 15);
    Array.prototype.push.apply(actions, improvements.map(function(issue) { return issue.suggestedFix; }));
    reasons.push('リスト改善余地あり');
  }

  var uniqueActions = uniqueStrings_(actions);
  var judgment = stockStatus === 'outofstock' ? 'Restock候補' : (score >= 70 ? 'HIGH' : (score >= 45 ? 'MEDIUM' : 'LOW'));

  return {
    createdAt: new Date(),
    rank: '',
    score: score,
    model: product.model,
    sku: product.sku,
    name: product.name,
    brand: brandSeries.brand,
    series: brandSeries.series,
    status: product.status,
    stockStatus: product.stockStatus,
    stockQuantity: product.stockQuantity,
    price: product.price,
    regularPrice: product.regularPrice,
    categories: product.categories,
    judgment: judgment,
    recommendedAction: uniqueActions.join(' / '),
    recommendedWdbPrice: suggestWooWdbPrice_(price),
    shippingPolicy: 'Free shipping',
    reason: uniqueStrings_(reasons).join(' / '),
    productId: product.productId,
    permalink: product.permalink,
    sourceSheet: product.sourceSheet
  };
}

function createWooNextDaySalesCandidateSheet_(candidates) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(WOO_NEXT_DAY_CANDIDATE_SHEET) || ss.insertSheet(WOO_NEXT_DAY_CANDIDATE_SHEET);
  var headers = ['作成日時', 'Rank', 'Score', 'Model', 'SKU', 'Name', 'Brand', 'Series', 'Current Status', 'Stock Status', 'Stock Quantity', 'Price', 'Regular Price', 'Categories', '判定', '推奨アクション', '推奨WDB価格', 'Shipping Policy', '理由', 'Product ID', 'Permalink', 'Source Sheet'];
  var rows = candidates.map(function(c) {
    return [c.createdAt, c.rank, c.score, c.model, c.sku, c.name, c.brand, c.series, c.status, c.stockStatus, c.stockQuantity, c.price, c.regularPrice, c.categories, c.judgment, c.recommendedAction, c.recommendedWdbPrice, c.shippingPolicy, c.reason, c.productId, c.permalink, c.sourceSheet];
  });
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function createWooListImprovementSheet_(improvements) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(WOO_LIST_IMPROVEMENT_SHEET) || ss.insertSheet(WOO_LIST_IMPROVEMENT_SHEET);
  var headers = ['作成日時', 'Priority', 'Model', 'SKU', 'Name', 'Issue Type', 'Current Value', 'Suggested Fix', 'Reason', 'Product ID', 'Permalink', 'Source Sheet'];
  var rows = improvements.map(function(issue) {
    return [issue.createdAt, issue.priority, issue.model, issue.sku, issue.name, issue.issueType, issue.currentValue, issue.suggestedFix, issue.reason, issue.productId, issue.permalink, issue.sourceSheet];
  });
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function normalizeWooModelFromSkuOrName_(sku, name) {
  var source = (String(sku || '') + ' ' + String(name || '')).toUpperCase();
  var patterns = [
    /\b[A-Z]{2,5}-[A-Z0-9]{3,8}-[A-Z0-9]{1,6}\b/,
    /\b[A-Z]{2,5}-[A-Z0-9]{4,12}\b/,
    /\b(?:GW|DW|GA|GM|GST|GMW|GLX|GBD|PRW|PRG|OCW|SBD[CXGLNRY]|SRP[EGX]|SSC|BN|BJ|RN)-[A-Z0-9-]{3,14}\b/,
    /\b[A-Z]{3,6}[0-9]{3,5}[A-Z0-9-]*\b/
  ];
  for (var i = 0; i < patterns.length; i++) {
    var match = source.match(patterns[i]);
    if (match) return match[0].replace(/--+/g, '-');
  }
  return '要確認';
}

function judgeWooListImprovement_(product) {
  var issues = [];
  addWooImprovementIssue_(issues, product, !product.sku, 'HIGH', 'SKU空欄', product.sku, 'SKU確認', 'SKUが空欄です。');
  addWooImprovementIssue_(issues, product, !product.price && !product.regularPrice, 'HIGH', '価格空欄', product.price || product.regularPrice, '価格確認', '価格が空欄です。');
  addWooImprovementIssue_(issues, product, !product.stockStatus && product.stockQuantity === '', 'HIGH', 'Stock不明', product.stockStatus || product.stockQuantity, 'Stock確認', 'Stock Status / Stock Quantityが不明です。');
  addWooImprovementIssue_(issues, product, !product.status, 'MEDIUM', 'Status不明', product.status, 'Draft確認', 'Current Statusが不明です。');
  addWooImprovementIssue_(issues, product, !product.categories, 'MEDIUM', 'カテゴリ不足', product.categories, 'カテゴリ改善', 'Categoriesが不足しています。');
  addWooImprovementIssue_(issues, product, String(product.name || '').length > 0 && String(product.name || '').length < 20, 'MEDIUM', 'タイトル短すぎ', product.name, '説明文改善', 'Nameが短く訴求情報が不足している可能性があります。');
  addWooImprovementIssue_(issues, product, !/free\s*shipping/i.test([product.name, product.description, product.shortDescription, product.shippingClass].join(' ')), 'LOW', 'Free shipping表記不足', '', '説明文改善', 'Free shipping前提の表記が不足している可能性があります。');
  addWooImprovementIssue_(issues, product, !product.images, 'LOW', '画像不足', product.images, '画像追加', '画像情報が不足している可能性があります。');
  addWooImprovementIssue_(issues, product, !product.tags, 'LOW', 'タグ不足', product.tags, 'タグ改善', 'Tagsが不足しています。');
  return issues;
}

function mapWooProductAnalysisRow_(headers, row, sourceSheet) {
  function value(names) {
    for (var i = 0; i < names.length; i++) {
      var idx = headers.indexOf(names[i]);
      if (idx !== -1) return row[idx];
    }
    return '';
  }
  var sku = value(['SKU', 'Sku']);
  var name = value(['Name', 'Product Name', 'Title']);
  return {
    hasAnyValue: row.some(function(cell) { return cell !== '' && cell !== null && cell !== undefined; }),
    sourceSheet: sourceSheet,
    productId: value(['ID', 'Product ID', 'ProductID', 'product_id']),
    sku: sku,
    name: name,
    model: normalizeWooModelFromSkuOrName_(sku, name),
    status: value(['Status', 'Current Status', 'Post Status']),
    stockStatus: value(['Stock Status', 'StockStatus', 'New Stock Status']),
    stockQuantity: value(['Stock Quantity', 'StockQuantity', 'New Stock Quantity']),
    price: value(['Price', 'Current Price', 'New Price']),
    regularPrice: value(['Regular Price', 'RegularPrice']),
    categories: value(['Categories', 'Category']),
    tags: value(['Tags', 'Tag']),
    images: value(['Images', 'Image', 'Image URL', 'Image URLs']),
    description: value(['Description', '説明']),
    shortDescription: value(['Short Description', 'ShortDescription']),
    shippingClass: value(['Shipping Class', 'ShippingClass']),
    permalink: value(['Permalink', 'URL', 'Product URL'])
  };
}

function detectWooBrandSeries_(text) {
  var source = String(text || '');
  var brand = '要確認';
  var series = 'Watch';
  var keywordScore = 0;
  if (/casio|g[-\s]?shock|g[-\s]?lide/i.test(source)) {
    brand = 'Casio';
    series = /g[-\s]?lide/i.test(source) ? 'G-LIDE' : (/g[-\s]?shock/i.test(source) ? 'G-SHOCK' : 'Casio');
  } else if (/seiko/i.test(source)) {
    brand = 'Seiko';
    series = /prospex/i.test(source) ? 'Prospex' : (/selection/i.test(source) ? 'Selection' : 'Seiko');
  } else if (/citizen/i.test(source)) {
    brand = 'Citizen';
    series = /promaster/i.test(source) ? 'Promaster' : 'Citizen';
  } else if (/orient/i.test(source)) {
    brand = 'Orient';
    series = 'Orient';
  }
  ['G-SHOCK', 'G-LIDE', 'Tough Solar', 'Multi Band 6', 'JDM', 'Prospex', 'Selection', 'Promaster'].forEach(function(keyword) {
    var regex = new RegExp(keyword.replace(/[-\s]/g, '[-\\s]?'), 'i');
    if (regex.test(source)) keywordScore += 5;
  });
  return { brand: brand, series: series, keywordScore: keywordScore };
}

function suggestWooWdbPrice_(price) {
  if (!price) return '要確認';
  if (price >= 100 && price <= 180) return '$' + price.toFixed(2) + ' Free shipping / 回転重視';
  if (price > 180 && price <= 300) return '$' + price.toFixed(2) + ' Free shipping / 利益重視';
  return '$' + price.toFixed(2) + ' Free shipping / 要確認';
}

function parseWooNumber_(value) {
  if (value === undefined || value === null || value === '') return 0;
  var number = Number(String(value).replace(/[^0-9.\-]/g, ''));
  return isNaN(number) ? 0 : number;
}

function uniqueStrings_(values) {
  var seen = {};
  return values.filter(function(value) {
    var key = String(value || '');
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function addWooImprovementIssue_(issues, product, condition, priority, issueType, currentValue, suggestedFix, reason) {
  if (!condition) return;
  issues.push({
    createdAt: new Date(),
    priority: priority,
    model: product.model,
    sku: product.sku,
    name: product.name,
    issueType: issueType,
    currentValue: currentValue,
    suggestedFix: suggestedFix,
    reason: reason,
    productId: product.productId,
    permalink: product.permalink,
    sourceSheet: product.sourceSheet
  });
}
