/**
 * Builds a read-only preview from neutral source rows and a complete snapshot
 * of WooCommerce products. This file deliberately contains no I/O entrypoint.
 */

var WOO_DRAFT_BRIDGE_BRANDS_ = ['CASIO', 'CITIZEN', 'SEIKO', 'ORIENT'];
var WOO_DRAFT_BRIDGE_EXISTING_STATUSES_ = ['publish', 'draft', 'pending'];
var WOO_DRAFT_BRIDGE_NEW_CONDITIONS_ = ['NEW', 'BRAND NEW', 'UNUSED', 'NEW WITH TAGS', 'NEW WITHOUT TAGS', '新品', '未使用'];
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

function getValidWooDraftBridgeModelKey_(value) {
  if (typeof value !== 'string') return '';
  var normalized = normalizeWooDraftBridgeText_(value).trim();
  if (!/^[A-Z0-9]+(?:[\s-]+[A-Z0-9]+)*$/.test(normalized)) return '';
  var key = normalizeWooDraftBridgeModelKey_(normalized);
  return key.length >= 5 && /[A-Z]/.test(key) && /[0-9]/.test(key) ? key : '';
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

function validateWooDraftBridgeConditionAliases_(row) {
  var fields = ['condition', 'itemCondition'];
  var supplied = false;
  var values = [];
  for (var fieldIndex = 0; fieldIndex < fields.length; fieldIndex++) {
    var field = fields[fieldIndex];
    if (!row || !Object.prototype.hasOwnProperty.call(row, field)) continue;
    supplied = true;
    var value = row[field];
    if (typeof value !== 'string' || !value.trim()) {
      return { status: 'invalid', reason: 'condition_alias_invalid', detail: field + ' must be a non-empty string', values: [] };
    }
    values.push(normalizeWooDraftBridgeText_(value).trim().replace(/\s+/g, ' '));
  }
  if (!supplied) return { status: 'missing', reason: 'new_condition_not_confirmed', values: [] };
  var uniqueValues = values.filter(function(value, index, allValues) {
    return allValues.indexOf(value) === index;
  });
  if (uniqueValues.length > 1) {
    return { status: 'conflict', reason: 'condition_alias_conflict', values: values };
  }
  var condition = uniqueValues[0];
  if (WOO_DRAFT_BRIDGE_NEW_CONDITIONS_.indexOf(condition) !== -1) {
    return { status: 'valid', condition: condition, values: values };
  }
  return { status: 'non_new', condition: condition, values: values };
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

function extractWooDraftBridgeModels_(value, allowedModels) {
  if (!Array.isArray(allowedModels)) return [];
  return uniqueWooDraftBridgeModels_(allowedModels.filter(function(model) {
    return !!getValidWooDraftBridgeModelKey_(model) && wooDraftBridgeNameHasExactModel_(value, model);
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

function validateWooDraftBridgeSourceModelAliases_(row) {
  var fields = ['model', 'modelNumber', 'model_number'];
  var supplied = false;
  var values = [];
  var invalid = '';
  for (var fieldIndex = 0; fieldIndex < fields.length; fieldIndex++) {
    var field = fields[fieldIndex];
    if (!row || !Object.prototype.hasOwnProperty.call(row, field)) continue;
    supplied = true;
    var value = row[field];
    if (typeof value === 'string') {
      if (!value.trim() || !getValidWooDraftBridgeModelKey_(value)) {
        invalid = field + ' must be a complete valid model identity';
        break;
      }
      values.push(value);
      continue;
    }
    if (!Array.isArray(value) || value.length === 0) {
      invalid = field + ' must be a non-empty dense string array';
      break;
    }
    for (var itemIndex = 0; itemIndex < value.length; itemIndex++) {
      if (!Object.prototype.hasOwnProperty.call(value, itemIndex)) {
        invalid = field + '[' + itemIndex + '] is missing (sparse array)';
        break;
      }
      if (typeof value[itemIndex] !== 'string' || !value[itemIndex].trim() || !getValidWooDraftBridgeModelKey_(value[itemIndex])) {
        invalid = field + '[' + itemIndex + '] must be a complete valid model identity';
        break;
      }
      values.push(value[itemIndex]);
    }
    if (invalid) break;
  }
  if (invalid) return { status: 'invalid', reason: 'source_model_alias_invalid', detail: invalid, values: [] };
  if (!supplied) return { status: 'missing', reason: 'structured_model_missing', values: [] };
  var keys = {};
  var uniqueKeys = [];
  values.forEach(function(value) {
    var key = getValidWooDraftBridgeModelKey_(value);
    if (!keys[key]) {
      keys[key] = true;
      uniqueKeys.push(key);
    }
  });
  if (!uniqueKeys.length) return { status: 'invalid', reason: 'source_model_alias_invalid', detail: 'no valid model identity', values: [] };
  if (uniqueKeys.length > 1) return { status: 'ambiguous', reason: 'multiple_model_candidates', values: values, keys: uniqueKeys };
  return { status: 'valid', reason: '', values: values, keys: uniqueKeys };
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
  var structuredBrands = [];
  var brandFields = ['brand', 'maker'];
  for (var brandIndex = 0; brandIndex < brandFields.length; brandIndex++) {
    var brandField = brandFields[brandIndex];
    if (!row || !Object.prototype.hasOwnProperty.call(row, brandField) || row[brandField] === '') continue;
    if (!isWooDraftBridgeNonBlankString_(row[brandField])) {
      classified.classification = 'unresolved';
      classified.reason = 'structured_brand_invalid';
      return classified;
    }
    structuredBrands.push(normalizeWooDraftBridgeText_(row[brandField]).trim());
  }
  if (!structuredBrands.length) {
    classified.classification = 'unresolved';
    classified.reason = 'structured_brand_missing';
    return classified;
  }
  var distinctBrands = structuredBrands.filter(function(brand, brandIndex, allBrands) {
    return allBrands.indexOf(brand) === brandIndex;
  });
  if (distinctBrands.length !== 1) {
    classified.classification = 'unresolved';
    classified.reason = 'structured_brand_conflict';
    return classified;
  }
  if (WOO_DRAFT_BRIDGE_BRANDS_.indexOf(distinctBrands[0]) === -1) {
    classified.classification = 'excluded';
    classified.reason = 'unsupported_brand';
    return classified;
  }
  var conditionValidation = validateWooDraftBridgeConditionAliases_(row);
  if (conditionValidation.status === 'invalid' || conditionValidation.status === 'conflict') {
    classified.classification = 'unresolved';
    classified.reason = conditionValidation.reason;
    classified.detail = conditionValidation.detail || conditionValidation.values.join(' / ');
    return classified;
  }
  var condition = conditionValidation.condition || '';
  var conditionEvidence = conditionValidation.values.join(' ');
  var itemEvidence = normalizeWooDraftBridgeText_(
    title + ' ' + getWooDraftBridgeValue_(row, ['category'])
  );
  var excluded = /\b(USED|PRE[ -]?OWNED|SECONDHAND|PARTS?|REPAIR|ACCESSOR(?:Y|IES))\b|中古|部品|アクセサリ/.test(conditionEvidence + ' ' + itemEvidence);
  var replacementAccessoryConflict = /\b(?:REPLACEMENT|REPLACE|SPARE)\b[^\r\n]*\b(?:BAND|STRAP|BRACELET)\b|\b(?:BAND|STRAP|BRACELET)\b[^\r\n]*\b(?:REPLACEMENT|REPLACE|SPARE)\b|交換[^\r\n]*(?:ベルト|バンド)|(?:ベルト|バンド)[^\r\n]*交換/.test(itemEvidence);
  var explicitlyNew = conditionValidation.status === 'valid';

  if (replacementAccessoryConflict) {
    classified.classification = 'unresolved';
    classified.reason = 'product_type_title_conflict';
    return classified;
  }
  if (excluded || !explicitlyNew) {
    classified.classification = 'excluded';
    classified.reason = excluded ? 'not_a_new_watch' : 'new_condition_not_confirmed';
    return classified;
  }

  var modelValidation = validateWooDraftBridgeSourceModelAliases_(row);
  if (modelValidation.status === 'missing') {
    classified.classification = 'unresolved';
    classified.reason = modelValidation.reason;
    classified.modelCandidates = [];
    return classified;
  }
  if (modelValidation.status === 'invalid') {
    classified.classification = 'invalid';
    classified.reason = modelValidation.reason;
    classified.detail = modelValidation.detail;
    classified.modelCandidates = [];
    return classified;
  }
  if (modelValidation.status === 'ambiguous') {
    classified.classification = 'unresolved';
    classified.reason = modelValidation.reason;
    classified.modelCandidates = modelValidation.values;
    return classified;
  }

  classified.classification = 'valid';
  classified.brand = distinctBrands[0];
  classified.model = modelValidation.values[0];
  classified.modelKey = modelValidation.keys[0];
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
    var nameModels = extractWooDraftBridgeModels_(product && product.name, [model]);
    var nameModelKeys = nameModels.map(normalizeWooDraftBridgeModelKey_);
    var skuMatch = !!skuKey && skuKey === modelKey;
    var modelMatch = productModelKeys.indexOf(modelKey) !== -1;
    var nameMatch = wooDraftBridgeNameHasExactModel_(product && product.name, model);
    if (!skuMatch && !modelMatch && !nameMatch) return;

    var conflicts = [];
    if (productModelKeys.length > 1) conflicts.push('multiple_explicit_model_values');
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

function isWooDraftBridgeSubstantiveString_(value) {
  return isWooDraftBridgeNonBlankString_(value) && value.trim().length >= 2;
}

function hasWooDraftBridgeKeyFeatures_(value) {
  if (isWooDraftBridgeSubstantiveString_(value)) return true;
  return Array.isArray(value) && value.some(isWooDraftBridgeSubstantiveString_);
}

function getMissingWooDraftBridgeDescriptionFields_(row, source) {
  var content = row && row.descriptionContent;
  var missing = [];
  var isObject = content && typeof content === 'object' && !Array.isArray(content);
  var modelKey = isObject ? getValidWooDraftBridgeModelKey_(content.model) : '';
  if (!modelKey || modelKey !== source.modelKey) missing.push('descriptionContent.model');
  var brand = isObject && isWooDraftBridgeNonBlankString_(content.brand) ?
    normalizeWooDraftBridgeText_(content.brand).trim() : '';
  if (!brand || brand !== source.brand) missing.push('descriptionContent.brand');
  if (!isObject || !isWooDraftBridgeSubstantiveString_(content.series)) missing.push('descriptionContent.series');
  if (!isObject || !hasWooDraftBridgeKeyFeatures_(content.keyFeatures)) missing.push('descriptionContent.keyFeatures');
  var condition = isObject && isWooDraftBridgeNonBlankString_(content.condition) ?
    normalizeWooDraftBridgeText_(content.condition).trim().replace(/\s+/g, ' ') : '';
  if (WOO_DRAFT_BRIDGE_NEW_CONDITIONS_.indexOf(condition) === -1) missing.push('descriptionContent.condition');
  [
    'japanDomesticModel',
    'authenticFromJapan',
    'freeInternationalShippingFromJapan',
    'trackingAndCarefulPacking',
    'customsBuyerResponsibility',
    'buyerChecksModelSpecificationsSizeCompatibility',
    'contactBeforeOrdering',
    'humanConfirmationBeforePublish'
  ].forEach(function(field) {
    if (!isObject || content[field] !== true) missing.push('descriptionContent.' + field);
  });
  return missing;
}

function buildWooDraftBridgeDescription_(content) {
  var keyFeatures = Array.isArray(content.keyFeatures) ? content.keyFeatures.filter(isWooDraftBridgeSubstantiveString_) : [content.keyFeatures];
  return [
    'Model: ' + content.model,
    'Brand: ' + content.brand,
    'Series: ' + content.series.trim(),
    'Key features: ' + keyFeatures.map(function(value) { return value.trim(); }).join('; '),
    'Condition: New / unused.',
    'Japan domestic model / JDM.',
    'Authentic product sourced from Japan.',
    'Free international shipping from Japan.',
    'Tracking and careful packing are included.',
    "Customs / import duties are the buyer's responsibility where applicable.",
    'Before purchase, the buyer should check the model number, specifications, size, and compatibility.',
    'The buyer should contact the store before ordering if there are questions.',
    'Human confirmation is required before publish.'
  ].join('\n');
}

function buildWooDraftBridgeCandidate_(row, source, index, result) {
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
  candidate.descriptionContent = row && row.descriptionContent;
  candidate.sourceDescription = isWooDraftBridgeNonBlankString_(row && row.description) ? row.description : '';
  candidate.description = '';
  candidate.missingDescriptionFields = [];
  if (!source.productName) candidate.missingFields.push('productName');
  if (!selectedPrice.alias) {
    candidate.missingFields.push('price');
    result.missingPrices.push(candidate);
  }
  if (!selectedImages.alias) {
    candidate.missingFields.push('images');
    result.missingImages.push(candidate);
  }
  candidate.missingDescriptionFields = getMissingWooDraftBridgeDescriptionFields_(row, source);
  candidate.missingFields = candidate.missingFields.concat(candidate.missingDescriptionFields);
  if (!hasWooDraftBridgeNamedReferences_(row && row.categories)) candidate.missingFields.push('categories');
  if (!hasWooDraftBridgeNamedReferences_(row && row.tags)) candidate.missingFields.push('tags');
  if (!isWooDraftBridgeNonBlankString_(row && row.stockPolicy)) candidate.missingFields.push('stockPolicy');
  if (!isWooDraftBridgeNonBlankString_(row && row.shippingPolicy)) candidate.missingFields.push('shippingPolicy');
  if (!candidate.missingFields.length) candidate.description = buildWooDraftBridgeDescription_(candidate.descriptionContent);
  return candidate;
}

function validateWooDraftBridgeProduct_(product, sourceModels) {
  if (product === null) return 'must be a non-null object';
  if (typeof product !== 'object') return 'must be an object';
  if (Array.isArray(product)) return 'must not be an array';

  if (typeof product.status !== 'string' || WOO_DRAFT_BRIDGE_EXISTING_STATUSES_.indexOf(product.status) === -1) {
    return 'status must exactly equal publish, draft, or pending';
  }

  var identityKeys = [];
  if (Object.prototype.hasOwnProperty.call(product, 'sku') && product.sku !== '') {
    if (!isWooDraftBridgeNonBlankString_(product.sku)) return 'sku must be a non-blank string when provided';
    var skuKey = getValidWooDraftBridgeModelKey_(product.sku);
    if (!skuKey) return 'sku must contain a valid model identity';
    identityKeys.push(skuKey);
  }
  if (Object.prototype.hasOwnProperty.call(product, 'name') && product.name !== '') {
    if (!isWooDraftBridgeNonBlankString_(product.name)) return 'name must be a non-blank string when provided';
    extractWooDraftBridgeModels_(product.name, sourceModels).forEach(function(model) {
      identityKeys.push(getValidWooDraftBridgeModelKey_(model));
    });
    sourceModels.forEach(function(model) {
      if (wooDraftBridgeNameHasExactModel_(product.name, model)) {
        identityKeys.push(getValidWooDraftBridgeModelKey_(model));
      }
    });
  }

  var modelFields = ['model', 'modelNumber', 'model_number'];
  for (var i = 0; i < modelFields.length; i++) {
    var field = modelFields[i];
    var value = product[field];
    if (!Object.prototype.hasOwnProperty.call(product, field) || value === '') continue;
    if (typeof value !== 'string') {
      if (!Array.isArray(value) || value.length === 0) return field + ' must be a string or a non-empty string array';
      for (var j = 0; j < value.length; j++) {
        if (!Object.prototype.hasOwnProperty.call(value, j) || !isWooDraftBridgeNonBlankString_(value[j])) {
          return field + ' must contain only non-blank strings';
        }
      }
    }
    var parsedModels = parseWooDraftBridgeExplicitModels_(value);
    if (!parsedModels.length) return field + ' must contain a valid model identity';
    for (var modelIndex = 0; modelIndex < parsedModels.length; modelIndex++) {
      var modelKey = getValidWooDraftBridgeModelKey_(parsedModels[modelIndex]);
      if (!modelKey) return field + ' must contain only valid model identities';
      identityKeys.push(modelKey);
    }
  }
  var uniqueIdentityKeys = {};
  identityKeys.filter(Boolean).forEach(function(key) { uniqueIdentityKeys[key] = true; });
  var keys = Object.keys(uniqueIdentityKeys);
  if (!keys.length) return 'must include one matchable model identity in sku, model, modelNumber, model_number, or name';
  if (keys.length > 1) return 'contains conflicting or ambiguous model identities';
  return '';
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

  var sourceModelsForWooValidation = [];
  rows.forEach(function(row, index) {
    var source = classifyWooDraftBridgeSource_(row, index);
    if (source.classification === 'valid' && sourceModelsForWooValidation.indexOf(source.modelKey) === -1) {
      sourceModelsForWooValidation.push(source.model);
    }
  });
  var wooSnapshotValid = Array.isArray(wooProducts);
  if (wooSnapshotValid) {
    for (var productIndex = 0; productIndex < products.length; productIndex++) {
      if (!Object.prototype.hasOwnProperty.call(products, productIndex)) {
        result.errors.push('wooProducts[' + productIndex + '] is missing (sparse array).');
        wooSnapshotValid = false;
        continue;
      }
      var productError = validateWooDraftBridgeProduct_(products[productIndex], sourceModelsForWooValidation);
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
  var seenModels = {};

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
    if (!seenModels[source.modelKey]) {
      seenModels[source.modelKey] = source;
      result.uniqueModels.push(source);
    }
    var matches = findWooDraftBridgeProductMatches_(relevantProducts, source.model);
    var conflictingMatches = matches.filter(function(match) { return match.conflicts.length > 0; });
    if (matches.length > 1 || conflictingMatches.length > 0) {
      if (!firstByModel[source.modelKey]) {
        firstByModel[source.modelKey] = source;
      }
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
      if (firstByModel[source.modelKey]) {
        source.firstSourceIndex = firstByModel[source.modelKey].sourceIndex;
        source.firstSourceRowNumber = firstByModel[source.modelKey].sourceRowNumber;
        source.reason = 'duplicate_normalized_model';
        result.duplicates.push(source);
        result.accounting.push({ sourceIndex: index, classification: 'duplicates' });
        return;
      }
      firstByModel[source.modelKey] = source;
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

    var candidate = buildWooDraftBridgeCandidate_(row, source, index, result);
    if (candidate.missingFields.length > 0) {
      if (firstByModel[source.modelKey]) {
        source.firstSourceIndex = firstByModel[source.modelKey].sourceIndex;
        source.firstSourceRowNumber = firstByModel[source.modelKey].sourceRowNumber;
        source.reason = 'duplicate_normalized_model';
        result.duplicates.push(source);
        result.accounting.push({ sourceIndex: index, classification: 'duplicates' });
        return;
      }
      candidate.reason = 'required_candidate_fields_missing';
      result.unresolvedRows.push(candidate);
      result.accounting.push({ sourceIndex: index, classification: 'unresolvedRows' });
      return;
    }
    if (firstByModel[source.modelKey]) {
      source.firstSourceIndex = firstByModel[source.modelKey].sourceIndex;
      source.firstSourceRowNumber = firstByModel[source.modelKey].sourceRowNumber;
      source.reason = 'duplicate_normalized_model';
      result.duplicates.push(source);
      result.accounting.push({ sourceIndex: index, classification: 'duplicates' });
      return;
    }
    firstByModel[source.modelKey] = source;
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
