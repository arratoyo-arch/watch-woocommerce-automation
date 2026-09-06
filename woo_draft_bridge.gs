/**
 * Builds a read-only preview from neutral source rows and a complete snapshot
 * of WooCommerce products. This file deliberately contains no I/O entrypoint.
 */

var WOO_DRAFT_BRIDGE_BRANDS_ = ['CASIO', 'CITIZEN', 'SEIKO', 'ORIENT'];
var WOO_DRAFT_BRIDGE_EXISTING_STATUSES_ = ['publish', 'draft', 'pending'];
var WOO_DRAFT_BRIDGE_HYPHENS_ = /[‐‑‒–—―−ーｰ]/g;
var WOO_DRAFT_BRIDGE_WRISTWATCH_TYPES_ = ['WRISTWATCH', '腕時計'];
var WOO_DRAFT_BRIDGE_NON_WRISTWATCH_TYPES_ = [
  'CALCULATOR', 'CLOCK', 'TABLE CLOCK', 'WALL CLOCK', 'ACCESSORY',
  'WATCH ACCESSORY', 'BAND', 'STRAP', 'PARTS'
];

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

function getWooDraftBridgeStringValue_(row, names) {
  for (var i = 0; i < names.length; i++) {
    var value = row && row[names[i]];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function getValidatedWooDraftBridgeValue_(row, names, validator) {
  for (var i = 0; i < names.length; i++) {
    var value = row && row[names[i]];
    if (validator(value)) return { value: value, alias: names[i] };
  }
  return { value: '', alias: '' };
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
  if (new RegExp('(^|[^A-Z0-9])' + pattern + '($|[^A-Z0-9])').test(normalizedName)) return true;
  var modelKey = normalizeWooDraftBridgeModelKey_(model);
  var separatorVariantPattern = modelKey.split('').map(escapeWooDraftBridgeRegex_).join('[\\s-]*');
  return new RegExp('(^|[^A-Z0-9])' + separatorVariantPattern + '($|[^A-Z0-9])').test(normalizedName);
}

function classifyWooDraftBridgeSource_(row, index) {
  var title = getWooDraftBridgeStringValue_(row, ['title', 'name', 'productName']);
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
  var productType = normalizeWooDraftBridgeText_(
    getWooDraftBridgeValue_(row, ['productType'])
  ).trim().replace(/\s+/g, ' ');
  classified.productType = productType;
  if (!productType) {
    classified.classification = 'unresolved';
    classified.reason = 'product_type_missing';
    return classified;
  }
  if (WOO_DRAFT_BRIDGE_NON_WRISTWATCH_TYPES_.indexOf(productType) !== -1) {
    classified.classification = 'excluded';
    classified.reason = 'non_wristwatch_product_type';
    return classified;
  }
  if (WOO_DRAFT_BRIDGE_WRISTWATCH_TYPES_.indexOf(productType) === -1) {
    classified.classification = 'unresolved';
    classified.reason = 'product_type_unknown';
    return classified;
  }
  var condition = normalizeWooDraftBridgeText_(
    getWooDraftBridgeValue_(row, ['condition', 'itemCondition'])
  ).trim().replace(/\s+/g, ' ');
  var itemEvidence = normalizeWooDraftBridgeText_(
    title + ' ' + getWooDraftBridgeValue_(row, ['category'])
  );
  var excluded = /\b(USED|PRE[ -]?OWNED|SECONDHAND|PARTS?|REPAIR|BAND|STRAP|BRACELET|ACCESSOR(?:Y|IES))\b|中古|部品|ベルト|バンド|アクセサリ/.test(condition + ' ' + itemEvidence);
  var allowedNewConditions = ['NEW', 'BRAND NEW', 'UNUSED', 'NEW WITH TAGS', 'NEW WITHOUT TAGS', '新品', '未使用'];
  var explicitlyNew = allowedNewConditions.indexOf(condition) !== -1;

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
  classified.productName = title;
  return classified;
}

function getWooDraftBridgeProductModels_(product) {
  var models = [];
  ['model', 'modelNumber', 'model_number'].forEach(function(field) {
    if (product && product[field] !== undefined && product[field] !== null && product[field] !== '') {
      models = models.concat(parseWooDraftBridgeExplicitModels_(product[field]));
    }
  });
  return uniqueWooDraftBridgeModels_(models);
}

function findWooDraftBridgeProductMatches_(products, model) {
  var modelKey = normalizeWooDraftBridgeModelKey_(model);
  var matches = [];
  products.forEach(function(product) {
    var skuKey = normalizeWooDraftBridgeModelKey_(product && product.sku);
    var productModels = getWooDraftBridgeProductModels_(product);
    var productModelKeys = productModels.map(normalizeWooDraftBridgeModelKey_);
    var nameModels = extractWooDraftBridgeModels_(product && product.name);
    var nameModelKeys = nameModels.map(normalizeWooDraftBridgeModelKey_);
    var skuMatch = !!skuKey && skuKey === modelKey;
    var modelMatch = productModelKeys.indexOf(modelKey) !== -1;
    var nameMatch = wooDraftBridgeNameHasExactModel_(product && product.name, model);
    if (!skuMatch && !modelMatch && !nameMatch) return;

    var conflicts = [];
    if (productModelKeys.length > 1) conflicts.push('multiple_explicit_model_values');
    if (nameModelKeys.length > 1) conflicts.push('multiple_name_model_values');
    if (skuKey && !skuMatch && (modelMatch || nameMatch)) conflicts.push('sku_conflicts_with_matched_identity');
    if (productModelKeys.length && !modelMatch && (skuMatch || nameMatch)) conflicts.push('explicit_model_conflicts_with_matched_identity');
    if (nameModelKeys.length && nameModelKeys.indexOf(modelKey) === -1 && (skuMatch || modelMatch)) conflicts.push('name_model_conflicts_with_matched_identity');
    matches.push({
      product: product,
      matchMethod: skuMatch ? 'sku' : (modelMatch ? 'model' : 'name'),
      productModels: productModels,
      nameModels: nameModels,
      conflicts: conflicts
    });
  });
  return matches;
}

function isWooDraftBridgeNonBlankString_(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isWooDraftBridgePositivePrice_(value) {
  if (typeof value === 'number') return isFinite(value) && value > 0;
  if (typeof value !== 'string') return false;
  var normalized = value.normalize('NFKC').trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return false;
  var amount = Number(normalized);
  return isFinite(amount) && amount > 0;
}

function isWooDraftBridgeImageReference_(value) {
  if (isWooDraftBridgeNonBlankString_(value)) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return isWooDraftBridgeNonBlankString_(value.src) || isWooDraftBridgeNonBlankString_(value.url);
}

function hasWooDraftBridgeImages_(value) {
  var items = Array.isArray(value) ? value : [value];
  return items.some(isWooDraftBridgeImageReference_);
}

function isWooDraftBridgeNamedReference_(value) {
  if (isWooDraftBridgeNonBlankString_(value)) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (isWooDraftBridgeNonBlankString_(value.name)) return true;
  return (typeof value.id === 'number' && isFinite(value.id) && value.id > 0) ||
    (typeof value.id === 'string' && value.id.trim().length > 0);
}

function hasWooDraftBridgeNamedReferences_(value) {
  return Array.isArray(value) && value.some(isWooDraftBridgeNamedReference_);
}

function validateWooDraftBridgeProduct_(product) {
  if (product === null) return 'must be a non-null object';
  if (typeof product !== 'object') return 'must be an object';
  if (Array.isArray(product)) return 'must not be an array';

  if (typeof product.status !== 'string' || WOO_DRAFT_BRIDGE_EXISTING_STATUSES_.indexOf(product.status) === -1) {
    return 'status must exactly equal publish, draft, or pending';
  }

  var hasIdentity = false;
  if (Object.prototype.hasOwnProperty.call(product, 'sku') && product.sku !== '') {
    if (!isWooDraftBridgeNonBlankString_(product.sku)) return 'sku must be a non-blank string when provided';
    hasIdentity = true;
  }
  if (Object.prototype.hasOwnProperty.call(product, 'name') && product.name !== '') {
    if (!isWooDraftBridgeNonBlankString_(product.name)) return 'name must be a non-blank string when provided';
    hasIdentity = true;
  }

  var modelFields = ['model', 'modelNumber', 'model_number'];
  for (var i = 0; i < modelFields.length; i++) {
    var field = modelFields[i];
    var value = product[field];
    if (!Object.prototype.hasOwnProperty.call(product, field) || value === '') continue;
    if (typeof value === 'string') {
      if (!value.trim()) return field + ' must be non-blank when provided';
      hasIdentity = true;
      continue;
    }
    if (!Array.isArray(value) || value.length === 0) return field + ' must be a string or a non-empty string array';
    for (var j = 0; j < value.length; j++) {
      if (!Object.prototype.hasOwnProperty.call(value, j) || !isWooDraftBridgeNonBlankString_(value[j])) {
        return field + ' must contain only non-blank strings';
      }
    }
    hasIdentity = true;
  }
  return hasIdentity ? '' : 'must include sku, model, modelNumber, model_number, or name identification';
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

  var wooSnapshotValid = Array.isArray(wooProducts);
  if (wooSnapshotValid) {
    for (var productIndex = 0; productIndex < products.length; productIndex++) {
      if (!Object.prototype.hasOwnProperty.call(products, productIndex)) {
        result.errors.push('wooProducts[' + productIndex + '] is missing (sparse array).');
        wooSnapshotValid = false;
        continue;
      }
      var productError = validateWooDraftBridgeProduct_(products[productIndex]);
      if (productError) {
        result.errors.push('wooProducts[' + productIndex + '] ' + productError + '.');
        wooSnapshotValid = false;
      }
    }
  }

  var relevantProducts = (wooSnapshotValid ? products : []).filter(function(product) {
    return WOO_DRAFT_BRIDGE_EXISTING_STATUSES_.indexOf(product.status) !== -1;
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

    var matches = findWooDraftBridgeProductMatches_(relevantProducts, source.model);
    var conflictingMatches = matches.filter(function(match) { return match.conflicts.length > 0; });
    if (matches.length > 1 || conflictingMatches.length > 0) {
      var unresolvedMatch = {
        sourceIndex: source.sourceIndex,
        sourceRowNumber: source.sourceRowNumber,
        source: source.source,
        brand: source.brand,
        model: source.model,
        modelKey: source.modelKey,
        reason: matches.length > 1 ? 'multiple_woo_product_matches' : 'woo_identity_conflict',
        matchMethod: matches.map(function(match) { return match.matchMethod; }),
        matchedProducts: matches
      };
      result.unresolvedRows.push(unresolvedMatch);
      result.warnings.push('Woo identity could not be resolved safely for source row ' + source.sourceRowNumber + '.');
      result.accounting.push({ sourceIndex: index, classification: 'unresolvedRows' });
      return;
    }
    if (matches.length === 1) {
      var resolvedMatch = matches[0];
      var existing = { source: source, matchMethod: resolvedMatch.matchMethod, products: [resolvedMatch.product] };
      result.existingWooProducts.push(existing);
      result.existingWooByStatus[resolvedMatch.product.status].push({
        sourceRowNumber: source.sourceRowNumber,
        model: source.model,
        matchMethod: resolvedMatch.matchMethod,
        product: resolvedMatch.product
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
      productName: source.productName,
      source: row,
      missingFields: []
    };
    var selectedPrice = getValidatedWooDraftBridgeValue_(row, ['price', 'regularPrice', 'regular_price'], isWooDraftBridgePositivePrice_);
    var selectedImages = getValidatedWooDraftBridgeValue_(row, ['images', 'imageUrls', 'image_urls', 'image'], hasWooDraftBridgeImages_);
    candidate.price = selectedPrice.value;
    candidate.priceAlias = selectedPrice.alias;
    candidate.images = selectedImages.value;
    candidate.imagesAlias = selectedImages.alias;
    if (!source.productName) candidate.missingFields.push('productName');
    if (!selectedPrice.alias) {
      candidate.missingFields.push('price');
      result.missingPrices.push(candidate);
    }
    if (!selectedImages.alias) {
      candidate.missingFields.push('images');
      result.missingImages.push(candidate);
    }
    if (!isWooDraftBridgeNonBlankString_(row && row.description)) candidate.missingFields.push('description');
    if (!hasWooDraftBridgeNamedReferences_(row && row.categories)) candidate.missingFields.push('categories');
    if (!hasWooDraftBridgeNamedReferences_(row && row.tags)) candidate.missingFields.push('tags');
    if (!isWooDraftBridgeNonBlankString_(row && row.stockPolicy)) candidate.missingFields.push('stockPolicy');
    if (!isWooDraftBridgeNonBlankString_(row && row.shippingPolicy)) candidate.missingFields.push('shippingPolicy');
    if (candidate.missingFields.length > 0) {
      candidate.reason = 'required_candidate_fields_missing';
      result.unresolvedRows.push(candidate);
      result.accounting.push({ sourceIndex: index, classification: 'unresolvedRows' });
      return;
    }
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
