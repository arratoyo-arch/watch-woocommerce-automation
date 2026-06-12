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
