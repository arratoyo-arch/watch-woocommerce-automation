/**
 * Builds a read-only preview from neutral source rows and a complete snapshot
 * of WooCommerce products. This file deliberately contains no I/O entrypoint.
 */

var WOO_DRAFT_BRIDGE_BRANDS_ = ['CASIO', 'CITIZEN', 'SEIKO', 'ORIENT'];
var WOO_DRAFT_BRIDGE_EXISTING_STATUSES_ = ['publish', 'draft', 'pending'];
var WOO_DRAFT_BRIDGE_HYPHENS_ = /[‐‑‒–—―−ーｰ]/g;

function normalizeWooDraftBridgeText_(value) {
  return String(value === undefined || value === null ? '' : value)
    .normalize('NFKC')
    .toUpperCase()
    .replace(WOO_DRAFT_BRIDGE_HYPHENS_, '-');
}

function normalizeWooDraftBridgeModelKey_(value) {
  return normalizeWooDraftBridgeText_(value).replace(/[\s-]+/g, '');
}

function getWooDraftBridgeValue_(row, names) {
  for (var i = 0; i < names.length; i++) {
    if (row && row[names[i]] !== undefined && row[names[i]] !== null && row[names[i]] !== '') {
      return row[names[i]];
    }
  }
  return '';
}

function uniqueWooDraftBridgeModels_(models) {
  var seen = {};
  return models.filter(function(model) {
    var key = normalizeWooDraftBridgeModelKey_(model);
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function extractWooDraftBridgeModels_(value) {
  var text = normalizeWooDraftBridgeText_(value);
  var tokens = text.match(/[A-Z0-9]+(?:-[A-Z0-9]+)+|[A-Z]{1,8}[0-9][A-Z0-9]{2,}/g) || [];
  return uniqueWooDraftBridgeModels_(tokens.map(function(token) {
    return token.trim().replace(/[\s-]+/g, '-');
  }).filter(function(token) {
    var key = normalizeWooDraftBridgeModelKey_(token);
    return key.length >= 5 && /[A-Z]/.test(key) && /[0-9]/.test(key);
  }));
}

function parseWooDraftBridgeExplicitModels_(value) {
  if (Array.isArray(value)) {
    return uniqueWooDraftBridgeModels_(value.map(function(item) {
      return normalizeWooDraftBridgeText_(item).trim().replace(/[\s-]+/g, '-');
    }).filter(Boolean));
  }
  if (!String(value || '').trim()) return [];
  return uniqueWooDraftBridgeModels_(String(value).split(/[,;|/]+/).map(function(item) {
    return normalizeWooDraftBridgeText_(item).trim().replace(/[\s-]+/g, '-');
  }).filter(Boolean));
}

function escapeWooDraftBridgeRegex_(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wooDraftBridgeNameHasExactModel_(name, model) {
  var normalizedName = normalizeWooDraftBridgeText_(name);
  var normalizedModel = normalizeWooDraftBridgeText_(model).trim();
  var segments = normalizedModel.split(/[\s-]+/).filter(Boolean);
  if (!segments.length || segments.some(function(segment) { return !/^[A-Z0-9]+$/.test(segment); })) return false;
  var pattern = segments.map(escapeWooDraftBridgeRegex_).join('[\\s-]+');
  return new RegExp('(^|[^A-Z0-9])' + pattern + '($|[^A-Z0-9])').test(normalizedName);
}

function classifyWooDraftBridgeSource_(row, index) {
  var title = String(getWooDraftBridgeValue_(row, ['title', 'name', 'productName']) || '');
  var brandValue = String(getWooDraftBridgeValue_(row, ['brand', 'maker']) || '');
  var brandEvidence = normalizeWooDraftBridgeText_(brandValue + ' ' + title);
  var brands = WOO_DRAFT_BRIDGE_BRANDS_.filter(function(brand) {
    return new RegExp('(^|[^A-Z])' + brand + '([^A-Z]|$)').test(brandEvidence);
  });
  var sourceRowNumber = getWooDraftBridgeValue_(row, ['sourceRowNumber', 'sourceRow', 'rowNumber']);
  var classified = {
    sourceIndex: index,
    sourceRowNumber: sourceRowNumber === '' ? index + 1 : sourceRowNumber,
    source: row
  };
  var conditionEvidence = normalizeWooDraftBridgeText_(
    title + ' ' + getWooDraftBridgeValue_(row, ['condition', 'itemCondition', 'category'])
  );
  var excluded = /\b(USED|PRE[ -]?OWNED|SECONDHAND|PARTS?|REPAIR|BAND|STRAP|BRACELET|ACCESSOR(?:Y|IES))\b|中古|部品|ベルト|バンド|アクセサリ/.test(conditionEvidence);
  var explicitlyNew = /\b(NEW|UNUSED|BRAND[ -]?NEW)\b|新品|未使用/.test(conditionEvidence);

  if (brands.length !== 1 || excluded || !explicitlyNew) {
    classified.classification = 'excluded';
    classified.reason = brands.length !== 1 ? 'unsupported_or_ambiguous_brand' : (excluded ? 'not_a_new_watch' : 'new_condition_not_confirmed');
    return classified;
  }

  var explicitValue = getWooDraftBridgeValue_(row, ['model', 'modelNumber', 'model_number']);
  var models = parseWooDraftBridgeExplicitModels_(explicitValue);
  if (!models.length && !String(explicitValue || '').trim()) models = extractWooDraftBridgeModels_(title);
  var validModels = models.filter(function(model) {
    var key = normalizeWooDraftBridgeModelKey_(model);
    return key.length >= 5 && /[A-Z]/.test(key) && /[0-9]/.test(key);
  });
  if (validModels.length !== 1) {
    classified.classification = validModels.length > 1 ? 'unresolved' : 'invalid';
    classified.reason = validModels.length > 1 ? 'multiple_model_candidates' : 'model_unknown_or_invalid';
    classified.modelCandidates = validModels;
    return classified;
  }

  classified.classification = 'valid';
  classified.brand = brands[0];
  classified.model = validModels[0];
  classified.modelKey = normalizeWooDraftBridgeModelKey_(validModels[0]);
  return classified;
}

function findWooDraftBridgeProductMatches_(products, model) {
  var modelKey = normalizeWooDraftBridgeModelKey_(model);
  var exactSku = products.filter(function(product) {
    return normalizeWooDraftBridgeModelKey_(product && product.sku) === modelKey;
  });
  if (exactSku.length) return { method: 'sku', products: exactSku };
  return {
    method: 'name',
    products: products.filter(function(product) {
      return wooDraftBridgeNameHasExactModel_(product && product.name, model);
    })
  };
}

function hasWooDraftBridgeValue_(value) {
  return !(value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0));
}

function buildWooDraftBridgePreview(sourceRows, wooProducts, options) {
  var rows = Array.isArray(sourceRows) ? sourceRows : [];
  var products = Array.isArray(wooProducts) ? wooProducts : [];
  var settings = options || {};
  var result = {
    sourceRows: rows.length,
    validNewWatchRows: [],
    uniqueModels: [],
    existingWooByStatus: { publish: [], draft: [], pending: [] },
    existingWooProducts: [],
    newDraftCandidates: [],
    duplicates: [],
    excludedRows: [],
    invalidModels: [],
    missingPrices: [],
    missingImages: [],
    unresolvedRows: [],
    warnings: [],
    errors: [],
    accounting: [],
    accountingComplete: false,
    readyForDraftSelection: false,
    firstFiveCandidates: []
  };

  if (!Array.isArray(sourceRows)) result.errors.push('sourceRows must be an array.');
  if (!Array.isArray(wooProducts)) result.errors.push('wooProducts must be an array.');
  if (settings.wooFetchComplete !== true) result.errors.push('Woo product retrieval is not confirmed complete.');
  if (settings.wooFetchError) result.errors.push('Woo product retrieval error: ' + String(settings.wooFetchError));

  var relevantProducts = products.filter(function(product) {
    return WOO_DRAFT_BRIDGE_EXISTING_STATUSES_.indexOf(String(product && product.status || '').toLowerCase()) !== -1;
  });
  var firstByModel = {};

  rows.forEach(function(row, index) {
    var source = classifyWooDraftBridgeSource_(row, index);
    if (source.classification === 'excluded') {
      result.excludedRows.push(source);
      result.accounting.push({ sourceIndex: index, classification: 'excludedRows' });
      return;
    }
    if (source.classification === 'invalid') {
      result.invalidModels.push(source);
      result.accounting.push({ sourceIndex: index, classification: 'invalidModels' });
      return;
    }
    if (source.classification === 'unresolved') {
      result.unresolvedRows.push(source);
      result.accounting.push({ sourceIndex: index, classification: 'unresolvedRows' });
      return;
    }

    result.validNewWatchRows.push(source);
    if (firstByModel[source.modelKey]) {
      source.firstSourceIndex = firstByModel[source.modelKey].sourceIndex;
      source.firstSourceRowNumber = firstByModel[source.modelKey].sourceRowNumber;
      source.reason = 'duplicate_normalized_model';
      result.duplicates.push(source);
      result.accounting.push({ sourceIndex: index, classification: 'duplicates' });
      return;
    }
    firstByModel[source.modelKey] = source;
    result.uniqueModels.push(source);

    var match = findWooDraftBridgeProductMatches_(relevantProducts, source.model);
    if (match.products.length) {
      var existing = { source: source, matchMethod: match.method, products: match.products };
      result.existingWooProducts.push(existing);
      match.products.forEach(function(product) {
        result.existingWooByStatus[String(product.status).toLowerCase()].push({
          sourceRowNumber: source.sourceRowNumber,
          model: source.model,
          matchMethod: match.method,
          product: product
        });
      });
      result.accounting.push({ sourceIndex: index, classification: 'existingWooProducts' });
      return;
    }

    var candidate = {
      sourceIndex: index,
      sourceRowNumber: source.sourceRowNumber,
      brand: source.brand,
      model: source.model,
      modelKey: source.modelKey,
      source: row,
      missingFields: []
    };
    var price = getWooDraftBridgeValue_(row, ['price', 'regularPrice', 'regular_price']);
    var images = getWooDraftBridgeValue_(row, ['images', 'imageUrls', 'image_urls', 'image']);
    if (!hasWooDraftBridgeValue_(price)) {
      candidate.missingFields.push('price');
      result.missingPrices.push(candidate);
    }
    if (!hasWooDraftBridgeValue_(images)) {
      candidate.missingFields.push('images');
      result.missingImages.push(candidate);
    }
    ['description', 'categories', 'tags', 'stockPolicy'].forEach(function(field) {
      if (!hasWooDraftBridgeValue_(row && row[field])) candidate.missingFields.push(field);
    });
    result.newDraftCandidates.push(candidate);
    result.accounting.push({ sourceIndex: index, classification: 'newDraftCandidates' });
  });

  result.accountingComplete = result.accounting.length === rows.length && result.accounting.every(function(item, index) {
    return item.sourceIndex === index;
  });
  if (!result.accountingComplete) result.errors.push('Every source row must be accounted for exactly once.');
  result.readyForDraftSelection = settings.wooFetchComplete === true && result.warnings.length === 0 && result.errors.length === 0 && result.accountingComplete;
  result.firstFiveCandidates = result.readyForDraftSelection ? result.newDraftCandidates.slice(0, 5) : [];
  return result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeWooDraftBridgeText_: normalizeWooDraftBridgeText_,
    normalizeWooDraftBridgeModelKey_: normalizeWooDraftBridgeModelKey_,
    extractWooDraftBridgeModels_: extractWooDraftBridgeModels_,
    wooDraftBridgeNameHasExactModel_: wooDraftBridgeNameHasExactModel_,
    buildWooDraftBridgePreview: buildWooDraftBridgePreview
  };
}
