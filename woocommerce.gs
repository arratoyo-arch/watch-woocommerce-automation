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

// Draft creation keeps using the shared WooCommerce API helpers above so the
// existing semi-automatic update flow remains intact.
var WOO_DRAFT_DW5750UE1JF_MODEL = 'DW-5750UE-1JF';
var WOO_DRAFT_CUSTOMER_FRIENDLY_NOTE = 'This is a draft product. Please confirm price, stock, images, categories, and final description before publishing.';

/**
 * Creates a WooCommerce product.
 */
function createWooCommerceProduct(payload) {
  if (!payload || Object.keys(payload).length === 0) {
    throw new Error('payload is required.');
  }

  return callWooCommerceApi_('products', {}, 'post', payload);
}

/**
 * Checks whether a WooCommerce product already exists by SKU or model text.
 */
function findWooProductBySkuOrModel_(skuOrModel) {
  assertRequiredValue_(skuOrModel, 'skuOrModel');

  var target = normalizeWooModelText_(skuOrModel);
  var exactSkuMatches = fetchWooCommerceProducts({
    sku: skuOrModel,
    status: 'any'
  });

  if (exactSkuMatches && exactSkuMatches.length > 0) {
    return exactSkuMatches[0];
  }

  var page = 1;
  var perPage = 100;

  while (true) {
    var products = fetchWooCommerceProducts({
      per_page: perPage,
      page: page,
      status: 'any',
      search: skuOrModel
    });

    if (!products || products.length === 0) {
      return null;
    }

    for (var i = 0; i < products.length; i++) {
      var product = products[i];
      var sku = normalizeWooModelText_(product.sku);
      var name = normalizeWooModelText_(product.name);
      var slug = normalizeWooModelText_(product.slug);
      var description = normalizeWooModelText_(stripHtml_(product.description));
      var shortDescription = normalizeWooModelText_(stripHtml_(product.short_description));

      if (
        sku === target ||
        name.indexOf(target) !== -1 ||
        slug.indexOf(target) !== -1 ||
        description.indexOf(target) !== -1 ||
        shortDescription.indexOf(target) !== -1
      ) {
        return product;
      }
    }

    if (products.length < perPage) {
      return null;
    }

    page += 1;
  }
}

/**
 * Dry run for creating the DW-5750UE-1JF WooCommerce draft product.
 */
function dryRunCreateWooDraft_DW5750UE1JF() {
  var existingProduct = findWooProductBySkuOrModel_(WOO_DRAFT_DW5750UE1JF_MODEL);

  if (existingProduct) {
    Logger.log('SKIP: already exists');
    Logger.log('Existing product ID: ' + existingProduct.id);
    Logger.log('Existing SKU: ' + existingProduct.sku);
    Logger.log('Existing status: ' + existingProduct.status);
    return { skipped: true, product: existingProduct };
  }

  var payload = buildWooDraftPayload_DW5750UE1JF_();
  Logger.log('DRY RUN: WooCommerce draft product payload');
  Logger.log(JSON.stringify(payload, null, 2));

  return { skipped: false, payload: payload };
}

/**
 * Creates the DW-5750UE-1JF WooCommerce draft product after duplicate check.
 */
function createWooDraft_DW5750UE1JF() {
  var existingProduct = findWooProductBySkuOrModel_(WOO_DRAFT_DW5750UE1JF_MODEL);

  if (existingProduct) {
    Logger.log('SKIP: already exists');
    Logger.log('Existing product ID: ' + existingProduct.id);
    Logger.log('Existing SKU: ' + existingProduct.sku);
    Logger.log('Existing status: ' + existingProduct.status);
    return { skipped: true, product: existingProduct };
  }

  var payload = buildWooDraftPayload_DW5750UE1JF_();
  var createdProduct = createWooCommerceProduct(payload);

  Logger.log('WooCommerce draft product created. Human check required before publish.');
  Logger.log('Product ID: ' + createdProduct.id);
  Logger.log('SKU: ' + createdProduct.sku);
  Logger.log('Status: ' + createdProduct.status);
  Logger.log('Regular price: ' + createdProduct.regular_price);
  Logger.log('Sale price: ' + createdProduct.sale_price);
  Logger.log('Stock quantity: ' + createdProduct.stock_quantity);

  return { skipped: false, product: createdProduct };
}

function buildWooDraftPayload_DW5750UE1JF_() {
  var productInfo = {
    model: WOO_DRAFT_DW5750UE1JF_MODEL,
    brand: 'Casio',
    series: 'G-SHOCK 5700 Series',
    keyFeatures: [
      'Japan domestic model / JDM',
      'Authentic product sourced from Japan',
      'Shock-resistant construction',
      '200-meter water resistance',
      'LED backlight, stopwatch, countdown timer, alarm, and calendar functions',
      'Approximately 5-year battery life'
    ],
    condition: 'New / unused item sourced from Japan.',
    note: WOO_DRAFT_CUSTOMER_FRIENDLY_NOTE
  };

  return {
    name: 'Casio G-SHOCK DW-5750UE-1JF 5700 Series Digital Watch Japan Model',
    type: 'simple',
    status: 'draft',
    sku: WOO_DRAFT_DW5750UE1JF_MODEL,
    regular_price: '149.99',
    sale_price: '139.99',
    manage_stock: true,
    stock_quantity: 1,
    stock_status: 'instock',
    shipping_required: true,
    short_description: buildWooCustomerFriendlyShortDescription_(productInfo),
    description: buildWooCustomerFriendlyDescription_(productInfo),
    categories: [
      { name: 'Casio' },
      { name: 'G-SHOCK' },
      { name: 'Digital Watches' },
      { name: 'Men’s Watches' }
    ],
    tags: [
      { name: 'Casio' },
      { name: 'G-SHOCK' },
      { name: 'DW-5750UE-1JF' },
      { name: 'DW-5750' },
      { name: '5700 Series' },
      { name: 'Japan Model' },
      { name: 'JDM' },
      { name: 'Ships from Japan' },
      { name: 'Free Shipping' },
      { name: 'New Unused' },
      { name: 'Digital Watch' },
      { name: 'Black Watch' },
      { name: 'Shock Resistant' },
      { name: '200m Water Resistant' }
    ],
    meta_data: [
      { key: 'model', value: WOO_DRAFT_DW5750UE1JF_MODEL },
      { key: 'brand', value: 'Casio' },
      { key: 'series', value: 'G-SHOCK 5700 Series' },
      { key: 'shipping_note', value: 'Free international shipping from Japan with tracking' },
      { key: 'condition_note', value: 'New / unused item sourced from Japan' },
      { key: 'customs_note', value: 'Import duties, taxes, and customs fees are buyer responsibility where applicable' },
      { key: 'human_check_required', value: 'yes' },
      { key: 'publish_checklist', value: 'Confirm price, stock, images, categories, model number, specifications, shipping note, customs note, and final description before publishing.' }
    ]
  };
}

function buildWooCustomerFriendlyShortDescription_(productInfo) {
  return [
    'New / unused ' + productInfo.brand + ' ' + productInfo.model + ' ' + productInfo.series + ' watch.',
    'Japan domestic model / JDM and authentic product sourced from Japan.',
    'Free international shipping from Japan with tracking.',
    'Please check the model number, specifications, size, and compatibility before purchase.'
  ].join(' ');
}

function buildWooCustomerFriendlyDescription_(productInfo) {
  return [
    'Model: ' + productInfo.model,
    '',
    'Brand: ' + productInfo.brand,
    'Series: ' + productInfo.series,
    '',
    'Key Features:',
    buildWooBulletList_(productInfo.keyFeatures),
    '',
    'Condition:',
    productInfo.condition,
    '',
    'Shipping:',
    'Free international shipping from Japan.',
    'We carefully pack and ship the item with tracking.',
    '',
    'Customs / Import Duties:',
    "Import duties, taxes, and customs fees may be charged by your country and are the buyer's responsibility where applicable.",
    '',
    'Before Purchase:',
    'Please check the model number, specifications, size, and compatibility before purchase.',
    'If you have any questions, please contact us before ordering.',
    '',
    'Note:',
    productInfo.note
  ].join('\n');
}

function buildWooBulletList_(items) {
  return (items || []).map(function(item) {
    return '* ' + item;
  }).join('\n');
}

function dryRunWooCustomerFriendlyDraftTemplate_DW5750UE1JF() {
  var payload = buildWooDraftPayload_DW5750UE1JF_();
  Logger.log('DRY RUN: customer friendly WooCommerce draft template');
  Logger.log('Name: ' + payload.name);
  Logger.log('Short description:');
  Logger.log(payload.short_description);
  Logger.log('Description:');
  Logger.log(payload.description);
  Logger.log('Tags: ' + payload.tags.map(function(tag) { return tag.name; }).join(', '));
  Logger.log('Meta data: ' + JSON.stringify(payload.meta_data, null, 2));
  return {
    name: payload.name,
    short_description: payload.short_description,
    description: payload.description,
    tags: payload.tags,
    meta_data: payload.meta_data
  };
}

function normalizeWooModelText_(value) {
  return String(value || '').trim().toUpperCase();
}

function stripHtml_(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ');
}
