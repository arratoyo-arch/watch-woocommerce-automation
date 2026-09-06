#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const bridge = require('../woo_draft_bridge.gs');

function completeDescription(model, brand) {
  return `Model ${model}. Brand ${brand}. Watch series and key features are stated. New and unused Japan domestic model (JDM). ` +
    'Authentic product sourced from Japan. Free international shipping from Japan with tracking and careful packing. ' +
    'Customs and import duties are the buyer responsibility where applicable. Before purchase, check the model number, ' +
    'specifications, size, and compatibility. Contact the store before ordering with questions. ' +
    'This draft requires human confirmation before publish.';
}

function sourceRow(overrides) {
  const row = Object.assign({
    brand: 'CASIO', model: 'GBD-200-9JF', title: 'Casio GBD-200-9JF New Watch', condition: 'New',
    productType: 'WRISTWATCH',
    price: '199', images: ['read-only-image-reference'],
    categories: ['Watches'], tags: ['JDM'], stockPolicy: 'Human confirmation required',
    shippingPolicy: 'Free international shipping from Japan with tracking'
  }, overrides || {});
  if (!overrides || !Object.prototype.hasOwnProperty.call(overrides, 'description')) {
    row.description = completeDescription(row.model, row.brand || row.maker);
  }
  if (!overrides || !Object.prototype.hasOwnProperty.call(overrides, 'descriptionContent')) {
    row.descriptionContent = {
      model: row.model, brand: row.brand || row.maker, series: 'Watch series', keyFeatures: ['Watch feature'], condition: row.condition,
      japanDomesticModel: true, authenticFromJapan: true, freeInternationalShippingFromJapan: true,
      trackingAndCarefulPacking: true, customsBuyerResponsibility: true,
      buyerChecksModelSpecificationsSizeCompatibility: true, contactBeforeOrdering: true,
      humanConfirmationBeforePublish: true
    };
  }
  return row;
}

assert.strictEqual(bridge.normalizeWooDraftBridgeModelKey_(' ＧＢＤ－２００ ‐ ９ｊｆ '), 'GBD2009JF');

const matchingModels = ['GBD-200-9JF', 'RN-AA0811E', 'SBTR026', 'NB1050-59E', 'VO10-6741F', 'WVA-M630D-2AJF'];
for (const model of matchingModels) {
  assert.strictEqual(bridge.wooDraftBridgeNameHasExactModel_(`Authentic ${model} New Watch`, model), true, `${model} exact name evidence`);
}
assert.strictEqual(bridge.wooDraftBridgeNameHasExactModel_('ＣＡＳＩＯ ＧＢＤ－２００—９ＪＦ New Watch', 'GBD-200-9JF'), true);
assert.strictEqual(bridge.wooDraftBridgeNameHasExactModel_('Casio GBD 200 9JF New Watch', 'GBD-200-9JF'), true);

const separatorVariantMatches = [
  ['Seiko SBTR-026 Watch', 'SBTR026'],
  ['Seiko SBTR026 Watch', 'SBTR-026'],
  ['Casio GBD2009JF Watch', 'GBD-200-9JF'],
  ['Casio GBD-200-9JF Watch', 'GBD2009JF'],
  ['Casio GBD 200 9JF Watch', 'GBD-200-9JF'],
  ['Casio GBD 200 9JF Watch', 'GBD2009JF'],
  ['ＣＡＳＩＯ ＧＢＤ―２００‐９ＪＦ Watch', 'GBD-200-9JF']
];
for (const [name, model] of separatorVariantMatches) {
  assert.strictEqual(bridge.wooDraftBridgeNameHasExactModel_(name, model), true, `${model} separator variant in ${name}`);
}

const nonMatches = [
  ['DW-5600E-1JF', 'DW-5600-1JF'],
  ['SHS-4529D-7AJF', 'SHS-4529D-7AJ'],
  ['BGD-5650-1JF', 'BGD-565'],
  ['RN-AA0002L', 'RN-AA0002'],
  ['ABC123456', 'ABC123'],
  ['XABC123Y', 'ABC123'],
  ['Description reference ABC123456789XYZ', 'ABC123']
];
for (const [name, model] of nonMatches) {
  assert.strictEqual(bridge.wooDraftBridgeNameHasExactModel_(name, model), false, `${model} must not partially match ${name}`);
}

const rejectedInternalModelNames = [
  'XABCDEFGHI123Y',
  'PREFIXABC123456XYZ',
  'LONGPREFIXSBTR026TAIL'
];
for (const name of rejectedInternalModelNames) {
  assert.deepStrictEqual(bridge.extractWooDraftBridgeModels_(name, ['ABC123', 'SBTR026']), [], `${name} must not yield an internal model`);
  const wooInput = [{ status: 'publish', name }];
  const wooBefore = JSON.stringify(wooInput);
  const rejected = bridge.buildWooDraftBridgePreview([sourceRow()], wooInput, { wooFetchComplete: true });
  assert.ok(rejected.errors.some(error => error.includes('wooProducts[0]')), `${name} must invalidate the Woo snapshot`);
  assert.strictEqual(rejected.readyForDraftSelection, false, name);
  assert.deepStrictEqual(rejected.firstFiveCandidates, [], name);
  assert.strictEqual(rejected.accountingComplete, true, name);
  assert.strictEqual(JSON.stringify(wooInput), wooBefore, `${name} input must not be changed`);
}

for (const name of ['XSBTR026', 'SBTR026Y', 'XSBTR026Y', 'PREFIXSBTR026SUFFIX']) {
  const extractedKeys = bridge.extractWooDraftBridgeModels_(name, ['SBTR026']).map(bridge.normalizeWooDraftBridgeModelKey_);
  assert.strictEqual(extractedKeys.includes('SBTR026'), false, `${name} must not yield the embedded SBTR026 model`);
  assert.strictEqual(bridge.wooDraftBridgeNameHasExactModel_(name, 'SBTR026'), false, `${name} must not match embedded SBTR026`);
}

const boundedExtractionFixtures = [
  ['Casio GBD-200-9JF Wristwatch', 'GBD-200-9JF'],
  ['Casio GBD2009JF Wristwatch', 'GBD2009JF'],
  ['Casio GBD 200 9JF Wristwatch', 'GBD-200-9JF'],
  ['Seiko SBTR026 Watch', 'SBTR026'],
  ['Seiko SBTR-026 Watch', 'SBTR-026'],
  ['Citizen NB1050-59E Wristwatch', 'NB1050-59E'],
  ['(SBTR026)', 'SBTR026'],
  ['[GBD-200-9JF]', 'GBD-200-9JF'],
  ['型番SBTR026腕時計', 'SBTR026'],
  ['SBTR026 at start', 'SBTR026'],
  ['at end SBTR026', 'SBTR026'],
  ['Casio GBD\u2011200\u20119JF Wristwatch', 'GBD-200-9JF']
];
for (const [name, expectedModel] of boundedExtractionFixtures) {
  const extracted = bridge.extractWooDraftBridgeModels_(name, [expectedModel]);
  assert.ok(extracted.some(model => bridge.normalizeWooDraftBridgeModelKey_(model) === bridge.normalizeWooDraftBridgeModelKey_(expectedModel)), `${name} must yield ${expectedModel}`);
  for (const model of extracted) {
    assert.strictEqual(bridge.wooDraftBridgeNameHasExactModel_(name, model), true, `validator/matcher invariant for ${name} / ${model}`);
  }
}

for (const name of ['Seiko SBTR026 / SBTR037 Watch', 'Seiko SBTR026, SBTR037 Watch', '(SBTR026) [SBTR037]']) {
  const extracted = bridge.extractWooDraftBridgeModels_(name, ['SBTR026', 'SBTR037']);
  assert.deepStrictEqual(extracted.map(bridge.normalizeWooDraftBridgeModelKey_).sort(), ['SBTR026', 'SBTR037'], `${name} must yield two models`);
  const ambiguous = bridge.buildWooDraftBridgePreview([
    sourceRow({ brand: 'SEIKO', model: 'SBTR026', title: 'Seiko SBTR026 Watch' }),
    sourceRow({ brand: 'SEIKO', model: 'SBTR037', title: 'Seiko SBTR037 Watch' })
  ], [{ status: 'publish', name }], { wooFetchComplete: true });
  assert.ok(ambiguous.errors.some(error => error.includes('conflicting or ambiguous')), `${name} must fail closed`);
}

const sourceBoundaryResult = bridge.buildWooDraftBridgePreview([
  sourceRow({ model: '', title: 'LONGPREFIXSBTR026TAIL', brand: 'SEIKO' })
], [], { wooFetchComplete: true });
assert.strictEqual(sourceBoundaryResult.invalidModels.length, 1, 'source title without structured model field must be invalid');
assert.strictEqual(sourceBoundaryResult.invalidModels[0].reason, 'source_model_alias_invalid');
assert.strictEqual(sourceBoundaryResult.accountingComplete, true);

let result = bridge.buildWooDraftBridgePreview(
  [sourceRow()],
  [{ id: 1, status: 'publish', sku: 'GBD-200-9JF', name: 'Unrelated name' }],
  { wooFetchComplete: true }
);
assert.strictEqual(result.existingWooProducts[0].matchMethod, 'sku', 'exact SKU has priority');

for (const status of ['publish', 'draft', 'pending']) {
  result = bridge.buildWooDraftBridgePreview(
    [sourceRow({ brand: 'SEIKO', model: 'SBTR026', title: 'Seiko SBTR026 New Watch' })],
    [{ id: status, status, sku: '', name: 'Seiko Chronograph SBTR026 Japan Watch' }],
    { wooFetchComplete: true }
  );
  assert.strictEqual(result.existingWooByStatus[status].length, 1, `${status} name evidence excludes candidate`);
  assert.strictEqual(result.newDraftCandidates.length, 0);
}

result = bridge.buildWooDraftBridgePreview(
  [sourceRow({ model: 'DW-5600-1JF', title: 'Casio DW-5600-1JF New Watch' })],
  [{ status: 'publish', sku: '', name: 'Casio DW-5600E-1JF New Watch' }],
  { wooFetchComplete: true }
);
assert.strictEqual(result.newDraftCandidates.length, 1, 'similar model remains a new candidate');

for (const [sourceModel, wooName] of [
  ['SBTR026', 'Seiko SBTR-026 Watch'],
  ['SBTR-026', 'Seiko SBTR026 Watch'],
  ['GBD-200-9JF', 'Casio GBD2009JF Watch'],
  ['GBD2009JF', 'Casio GBD-200-9JF Watch']
]) {
  result = bridge.buildWooDraftBridgePreview(
    [sourceRow({ model: sourceModel, title: `Watch ${sourceModel}` })],
    [{ id: wooName, status: 'publish', sku: '', name: wooName }],
    { wooFetchComplete: true }
  );
  assert.strictEqual(result.existingWooProducts.length, 1, `${sourceModel} must match ${wooName}`);
  assert.strictEqual(result.existingWooProducts[0].matchMethod, 'name');
}

result = bridge.buildWooDraftBridgePreview([
  sourceRow(),
  sourceRow({ model: 'GBD-200-1JF', title: 'Casio GBD-200-1JF Watch' })
], [
  { id: 'multi-name-models', status: 'publish', sku: '', name: 'Casio GBD2009JF alternative GBD-200-1JF' }
], { wooFetchComplete: true });
assert.ok(result.errors.some(error => error.includes('wooProducts[0]') && error.includes('conflicting or ambiguous')));
assert.strictEqual(result.readyForDraftSelection, false);
assert.strictEqual(result.firstFiveCandidates.length, 0);

result = bridge.buildWooDraftBridgePreview([
  sourceRow({ sourceRowNumber: 10 }),
  sourceRow({ model: 'ＧＢＤ－２００—９ＪＦ', sourceRowNumber: 22 })
], [], { wooFetchComplete: true });
assert.strictEqual(result.duplicates.length, 1);
assert.strictEqual(result.duplicates[0].firstSourceRowNumber, 10);

result = bridge.buildWooDraftBridgePreview([
  sourceRow({ model: '', title: 'Casio New Watch without model' }),
  sourceRow({ brand: 'CITIZEN', model: 'NB1050-59E|NB1050-59A', title: 'Citizen New Watch' }),
  sourceRow({ brand: 'ORIENT', model: '', title: 'Orient RN-AA0811E RN-AA0812L New Watch' })
], [], { wooFetchComplete: true });
assert.strictEqual(result.invalidModels.length, 3);
assert.strictEqual(result.unresolvedRows.length, 0);

const invalidSourceModelAliases = [
  { label: 'null first array element', model: [null, 'GBD-200-9JF'] },
  { label: 'null second array element', model: ['GBD-200-9JF', null] },
  { label: 'invalid second array element', model: ['GBD-200-9JF', 'not-a-model'] },
  { label: 'invalid first array element', model: ['not-a-model', 'GBD-200-9JF'] },
  { label: 'sparse model array', model: Object.assign(new Array(2), { 1: 'GBD-200-9JF' }) },
  { label: 'empty model array', model: [] },
  { label: 'empty model element', model: [''] },
  { label: 'blank model element', model: ['   '] },
  { label: 'boolean model element', model: [true, 'GBD-200-9JF'] },
  { label: 'nested model array', model: [['GBD-200-9JF']] },
  { label: 'invalid delimited model string', model: 'GBD-200-9JF|not-a-model' },
  { label: 'different model array values', model: ['GBD-200-9JF', 'SBTR026'] },
  { label: 'different model aliases', model: 'GBD-200-9JF', modelNumber: 'SBTR026' },
  { label: 'null model with valid modelNumber', model: null, modelNumber: 'GBD-200-9JF' },
  { label: 'invalid model with valid modelNumber', model: 'not-a-model', modelNumber: 'GBD-200-9JF' }
];
for (const fixture of invalidSourceModelAliases) {
  const row = sourceRow(Object.assign({ title: 'Casio GBD-200-9JF Watch' }, fixture));
  const before = JSON.stringify(row);
  result = bridge.buildWooDraftBridgePreview([row], [], { wooFetchComplete: true });
  assert.strictEqual(result.validNewWatchRows.length, 0, fixture.label);
  assert.strictEqual(result.newDraftCandidates.length, 0, fixture.label);
  assert.deepStrictEqual(result.firstFiveCandidates, [], fixture.label);
  assert.strictEqual(result.accounting.length, 1, fixture.label);
  assert.strictEqual(result.accountingComplete, true, fixture.label);
  assert.strictEqual(JSON.stringify(row), before, fixture.label);
  const classified = result.invalidModels.length ? result.invalidModels : result.unresolvedRows;
  assert.strictEqual(classified.length, 1, fixture.label);
  assert.ok(classified[0].reason === 'source_model_alias_invalid' || classified[0].reason === 'multiple_model_candidates', fixture.label);
}

function sourceWithValidatedDescriptionModel(overrides) {
  const row = sourceRow(overrides);
  if (overrides.removeModel) delete row.model;
  row.descriptionContent = Object.assign({}, row.descriptionContent, { model: 'GBD-200-9JF' });
  return row;
}
for (const fixture of [
  { label: 'model string', overrides: { model: 'GBD-200-9JF' } },
  { label: 'modelNumber string', overrides: { removeModel: true, modelNumber: 'GBD-200-9JF' } },
  { label: 'model_number string', overrides: { removeModel: true, model_number: 'GBD-200-9JF' } },
  { label: 'single model array', overrides: { model: ['GBD-200-9JF'] } },
  { label: 'same model array variants', overrides: { model: ['GBD-200-9JF', 'GBD2009JF', 'GBD 200 9JF'] } },
  { label: 'same model aliases', overrides: { model: 'GBD-200-9JF', modelNumber: 'GBD2009JF', model_number: 'GBD 200 9JF' } }
]) {
  result = bridge.buildWooDraftBridgePreview([sourceWithValidatedDescriptionModel(fixture.overrides)], [], { wooFetchComplete: true });
  assert.strictEqual(result.invalidModels.length, 0, fixture.label);
  assert.strictEqual(result.unresolvedRows.length, 0, fixture.label);
  assert.strictEqual(result.validNewWatchRows.length, 1, fixture.label);
  assert.strictEqual(result.newDraftCandidates.length, 1, fixture.label);
  assert.strictEqual(result.accountingComplete, true, fixture.label);
}

result = bridge.buildWooDraftBridgePreview([
  sourceRow({ condition: 'Used' }),
  sourceRow({ title: 'Casio replacement parts New' }),
  sourceRow({ title: 'Casio replacement band New' }),
  sourceRow({ title: 'Casio watch accessory New' })
], [], { wooFetchComplete: true });
assert.strictEqual(result.excludedRows.length, 3);
assert.strictEqual(result.unresolvedRows.length, 1);
assert.strictEqual(result.unresolvedRows[0].reason, 'product_type_title_conflict');

result = bridge.buildWooDraftBridgePreview([
  sourceRow({ productType: 'WRISTWATCH' }),
  sourceRow({ model: 'NB1050-59E', brand: 'CITIZEN', title: 'Citizen NB1050-59E New Watch', productType: '腕時計' })
], [], { wooFetchComplete: true });
assert.strictEqual(result.newDraftCandidates.length, 2);

result = bridge.buildWooDraftBridgePreview([
  sourceRow({ model: 'FX-991CW', title: 'Casio FX-991CW Scientific Calculator', productType: 'CALCULATOR' }),
  sourceRow({ model: 'DQ-750J-8JF', title: 'Casio DQ-750J-8JF Clock', productType: 'CLOCK' }),
  sourceRow({ title: 'Casio watch accessory New', productType: 'ACCESSORY' }),
  sourceRow({ productType: 'CALCULATOR', title: 'Casio GBD-200-9JF Watch' })
], [], { wooFetchComplete: true });
assert.strictEqual(result.excludedRows.length, 4);
assert.ok(result.excludedRows.every(item => item.reason === 'non_wristwatch_product_type' || item.reason === 'not_a_new_watch'));
assert.strictEqual(result.newDraftCandidates.length, 0);

result = bridge.buildWooDraftBridgePreview([
  sourceRow({ productType: '' }),
  sourceRow({ productType: 'UNKNOWN' }),
  sourceRow({ productType: '', categories: ['Watches'] }),
  sourceRow({ productType: '', title: 'Casio watch accessory New' })
], [], { wooFetchComplete: true });
assert.strictEqual(result.unresolvedRows.length, 4);
assert.deepStrictEqual(result.unresolvedRows.map(item => item.reason), ['product_type_missing', 'product_type_unknown', 'product_type_missing', 'product_type_missing']);
assert.strictEqual(result.newDraftCandidates.length, 0);
assert.strictEqual(result.accounting.length, 4);
assert.strictEqual(result.accountingComplete, true);

for (const [wooProduct, expectedMethod] of [
  [{ id: 'missing-name-sku', status: 'publish', sku: 'GBD-200-9JF', name: '' }, 'sku'],
  [{ id: 'missing-name-model', status: 'publish', sku: '', model: 'GBD-200-9JF', name: '' }, 'model']
]) {
  result = bridge.buildWooDraftBridgePreview(
    [sourceRow({ title: '', name: '', productName: '' })],
    [wooProduct],
    { wooFetchComplete: true }
  );
  assert.strictEqual(result.existingWooProducts.length, 1);
  assert.strictEqual(result.existingWooProducts[0].matchMethod, expectedMethod);
  assert.strictEqual(result.validNewWatchRows.length, 1);
  assert.strictEqual(result.uniqueModels.length, 1);
  assert.deepStrictEqual(result.accounting, [{ sourceIndex: 0, classification: 'existingWooProducts' }]);
}

result = bridge.buildWooDraftBridgePreview(
  [sourceRow({ title: '', name: '', productName: '' })], [], { wooFetchComplete: true }
);
assert.strictEqual(result.unresolvedRows.length, 1);
assert.ok(result.unresolvedRows[0].missingFields.includes('productName'));
assert.strictEqual(result.validNewWatchRows.length, 1);
assert.strictEqual(result.uniqueModels.length, 1);
assert.deepStrictEqual(result.accounting, [{ sourceIndex: 0, classification: 'unresolvedRows' }]);

result = bridge.buildWooDraftBridgePreview(
  [sourceRow({ title: '', name: '', productName: '', description: '' })],
  [{ id: 'missing-other-fields', status: 'publish', sku: '', model: 'GBD-200-9JF', name: '' }],
  { wooFetchComplete: true }
);
assert.strictEqual(result.existingWooProducts.length, 1);
assert.strictEqual(result.unresolvedRows.length, 0);

result = bridge.buildWooDraftBridgePreview(
  [sourceRow({ title: '', name: '', productName: '' })],
  [
    { id: 'missing-name-first', status: 'publish', sku: 'GBD-200-9JF', name: '' },
    { id: 'missing-name-second', status: 'draft', sku: 'GBD-200-9JF', name: '' }
  ],
  { wooFetchComplete: true }
);
assert.strictEqual(result.unresolvedRows[0].reason, 'multiple_woo_product_matches');
assert.strictEqual(result.readyForDraftSelection, false);
assert.strictEqual(result.accounting.length, 1);

const aliasFixtures = [
  { overrides: { price: ' ', regularPrice: '100' }, priceAlias: 'regularPrice' },
  { overrides: { price: '0x10', regularPrice: '100' }, priceAlias: 'regularPrice' },
  { overrides: { price: 0, regular_price: '100' }, priceAlias: 'regular_price' },
  { overrides: { price: '200', regularPrice: '100' }, priceAlias: 'price' },
  { overrides: { images: [], imageUrls: ['valid-image'] }, imagesAlias: 'imageUrls' },
  { overrides: { images: [''], image_urls: ['valid-image'] }, imagesAlias: 'image_urls' },
  { overrides: { images: [{}], image: 'valid-image' }, imagesAlias: 'image' },
  { overrides: { images: ['first-image'], imageUrls: ['second-image'] }, imagesAlias: 'images' }
];
for (const fixture of aliasFixtures) {
  result = bridge.buildWooDraftBridgePreview([sourceRow(fixture.overrides)], [], { wooFetchComplete: true });
  assert.strictEqual(result.newDraftCandidates.length, 1, JSON.stringify(fixture.overrides));
  if (fixture.priceAlias) assert.strictEqual(result.newDraftCandidates[0].priceAlias, fixture.priceAlias);
  if (fixture.imagesAlias) assert.strictEqual(result.newDraftCandidates[0].imagesAlias, fixture.imagesAlias);
  assert.strictEqual(result.accountingComplete, true);
}

result = bridge.buildWooDraftBridgePreview([sourceRow({
  price: ' ', regularPrice: '0x10', regular_price: 0,
  images: [], imageUrls: [''], image_urls: [{}], image: null
})], [], { wooFetchComplete: true });
assert.deepStrictEqual(result.unresolvedRows[0].missingFields.slice(0, 2), ['price', 'images']);
assert.strictEqual(result.missingPrices.length, 1);
assert.strictEqual(result.missingImages.length, 1);
assert.strictEqual(result.accounting.length, 1);

for (const price of ['10', '10.50', '0.01', ' 199.99 ', '１９９．９９']) {
  result = bridge.buildWooDraftBridgePreview([sourceRow({ price })], [], { wooFetchComplete: true });
  assert.strictEqual(result.newDraftCandidates.length, 1, 'valid decimal price: ' + price);
}

const invalidPrices = [
  '0', 0, '0.0', '-1', '+10', '0x10', '0X10', '0b10', '0B10', '0o10', '0O10',
  '1e3', '1E3', '.5', '1.', 'Infinity', 'NaN', '$10', '10 USD', '1,000',
  true, false, [], {}, Infinity, NaN
];
for (const price of invalidPrices) {
  result = bridge.buildWooDraftBridgePreview([sourceRow({ price })], [], { wooFetchComplete: true });
  assert.strictEqual(result.newDraftCandidates.length, 0, 'invalid price: ' + String(price));
  assert.strictEqual(result.unresolvedRows.length, 1, 'invalid price: ' + String(price));
  assert.ok(result.unresolvedRows[0].missingFields.includes('price'));
  assert.strictEqual(result.missingPrices.length, 1);
  assert.strictEqual(result.accounting.length, 1);
  assert.strictEqual(result.accountingComplete, true);
}

const validProductNames = [
  { title: 'Casio GBD-200-9JF New Watch' },
  { title: '', name: 'Casio GBD-200-9JF Name Field' },
  { title: '   ', productName: 'Casio GBD-200-9JF Product Name Field' },
  { title: true, name: 'Casio GBD-200-9JF Valid Name' },
  { title: {}, name: 'Casio GBD-200-9JF Valid Name' }
];
for (const overrides of validProductNames) {
  result = bridge.buildWooDraftBridgePreview([sourceRow(overrides)], [], { wooFetchComplete: true });
  assert.strictEqual(result.newDraftCandidates.length, 1);
  assert.ok(result.newDraftCandidates[0].productName.includes('GBD-200-9JF'));
}

for (const title of ['', '   ', '\t\n　', true, 123, {}, []]) {
  result = bridge.buildWooDraftBridgePreview([sourceRow({ title, name: '', productName: '' })], [], { wooFetchComplete: true });
  assert.strictEqual(result.newDraftCandidates.length, 0, 'invalid product name: ' + String(title));
  assert.strictEqual(result.unresolvedRows.length, 1);
  assert.deepStrictEqual(result.unresolvedRows[0].missingFields, ['productName']);
  assert.strictEqual(result.accounting.length, 1);
  assert.strictEqual(result.accountingComplete, true);
}

const invalidShippingPolicies = ['', '   ', '\t\n　', null, true, 123, [], {}];
for (const shippingPolicy of invalidShippingPolicies) {
  result = bridge.buildWooDraftBridgePreview([sourceRow({ shippingPolicy })], [], { wooFetchComplete: true });
  assert.strictEqual(result.newDraftCandidates.length, 0, 'invalid shipping policy: ' + String(shippingPolicy));
  assert.strictEqual(result.unresolvedRows.length, 1);
  assert.ok(result.unresolvedRows[0].missingFields.includes('shippingPolicy'));
  assert.strictEqual(result.accounting.length, 1);
  assert.strictEqual(result.accountingComplete, true);
}

result = bridge.buildWooDraftBridgePreview([
  sourceRow({ model: 'GBD-200-1JF', title: 'Casio GBD-200-1JF New Watch' }),
  sourceRow({ model: 'GBD-200-2JF', title: 'Casio GBD-200-2JF New Watch', shippingPolicy: '' })
], [], { wooFetchComplete: true });
assert.strictEqual(result.newDraftCandidates.length, 1);
assert.strictEqual(result.unresolvedRows.length, 1);
assert.deepStrictEqual(result.firstFiveCandidates.map(item => item.model), ['GBD-200-1JF']);
assert.deepStrictEqual(result.accounting.map(item => item.classification), ['newDraftCandidates', 'unresolvedRows']);

result = bridge.buildWooDraftBridgePreview([sourceRow({ price: '', images: [], description: '', categories: [], tags: [], stockPolicy: '', shippingPolicy: '' })], [], { wooFetchComplete: true });
assert.strictEqual(result.missingPrices.length, 1);
assert.strictEqual(result.missingImages.length, 1);
assert.strictEqual(result.newDraftCandidates.length, 0);
assert.strictEqual(result.firstFiveCandidates.length, 0);
assert.strictEqual(result.unresolvedRows.length, 1);
assert.deepStrictEqual(result.unresolvedRows[0].missingFields, ['price', 'images', 'categories', 'tags', 'stockPolicy', 'shippingPolicy']);
assert.strictEqual(result.unresolvedRows[0].reason, 'required_candidate_fields_missing');
assert.deepStrictEqual(result.accounting, [{ sourceIndex: 0, classification: 'unresolvedRows' }]);
assert.strictEqual(result.accountingComplete, true);

const invalidRequiredFixtures = [
  { price: '   ', images: [''], description: ' ', categories: [''], tags: [' '], stockPolicy: ' ' },
  { price: '\t\n　', images: ['   '], description: '\t\n　', categories: [null], tags: [null], stockPolicy: '\t' },
  { images: [null] }, { images: [{}] }, { images: [{ src: '   ' }] },
  { categories: [''] }, { categories: [null] }, { tags: ['   '] },
  { price: '0' }, { price: 0 }, { price: '-1' }, { price: 'NaN' },
  { price: Infinity }, { price: {} }, { stockPolicy: '\t' }
];
for (const overrides of invalidRequiredFixtures) {
  result = bridge.buildWooDraftBridgePreview([sourceRow(overrides)], [], { wooFetchComplete: true });
  assert.strictEqual(result.newDraftCandidates.length, 0, JSON.stringify(overrides));
  assert.strictEqual(result.firstFiveCandidates.length, 0, JSON.stringify(overrides));
  assert.strictEqual(result.unresolvedRows.length, 1, JSON.stringify(overrides));
  assert.strictEqual(result.accounting.length, 1, JSON.stringify(overrides));
  assert.strictEqual(result.accounting[0].classification, 'unresolvedRows', JSON.stringify(overrides));
  assert.strictEqual(result.accountingComplete, true, JSON.stringify(overrides));
}

result = bridge.buildWooDraftBridgePreview([sourceRow({
  images: ['', { src: 'image-ref' }], categories: [null, { name: 'Watches' }], tags: [' ', { id: 10 }]
})], [], { wooFetchComplete: true });
assert.strictEqual(result.newDraftCandidates.length, 1);

result = bridge.buildWooDraftBridgePreview([
  sourceRow({ model: 'GBD-200-1JF', title: 'Casio GBD-200-1JF New Watch' }),
  sourceRow({ model: 'GBD-200-2JF', title: 'Casio GBD-200-2JF New Watch', price: ' ', images: [' '] })
], [], { wooFetchComplete: true });
assert.strictEqual(result.newDraftCandidates.length, 1);
assert.strictEqual(result.unresolvedRows.length, 1);
assert.deepStrictEqual(result.firstFiveCandidates.map(item => item.model), ['GBD-200-1JF']);
assert.deepStrictEqual(result.accounting.map(item => item.classification), ['newDraftCandidates', 'unresolvedRows']);

result = bridge.buildWooDraftBridgePreview([
  sourceRow({ model: 'GBD-200-1JF', title: 'Casio GBD-200-1JF New Watch' }),
  sourceRow({ model: 'GBD-200-2JF', title: 'Casio GBD-200-2JF New Watch', price: '', images: [] })
], [], { wooFetchComplete: true });
assert.strictEqual(result.newDraftCandidates.length, 1);
assert.strictEqual(result.unresolvedRows.length, 1);
assert.strictEqual(result.firstFiveCandidates.length, 1);
assert.strictEqual(result.firstFiveCandidates[0].model, 'GBD-200-1JF');
assert.deepStrictEqual(result.accounting.map(item => item.classification), ['newDraftCandidates', 'unresolvedRows']);
assert.strictEqual(result.accountingComplete, true);

result = bridge.buildWooDraftBridgePreview([sourceRow()], [
  { id: 1, status: 'publish', sku: 'GBD-200-9JF', name: 'First' },
  { id: 2, status: 'draft', sku: 'GBD-200-9JF', name: 'Second' }
], { wooFetchComplete: true });
assert.strictEqual(result.existingWooProducts.length, 0);
assert.strictEqual(result.unresolvedRows[0].reason, 'multiple_woo_product_matches');
assert.strictEqual(result.unresolvedRows[0].matchedProducts.length, 2);
assert.strictEqual(result.readyForDraftSelection, false);
assert.strictEqual(result.firstFiveCandidates.length, 0);

result = bridge.buildWooDraftBridgePreview([sourceRow()], [
  { id: 3, status: 'publish', sku: '', name: 'Casio GBD-200-9JF First' },
  { id: 4, status: 'pending', sku: '', name: 'Casio GBD 200 9JF Second' }
], { wooFetchComplete: true });
assert.strictEqual(result.unresolvedRows[0].reason, 'multiple_woo_product_matches');
assert.deepStrictEqual(result.unresolvedRows[0].matchMethod, ['name', 'name']);
assert.strictEqual(result.readyForDraftSelection, false);

result = bridge.buildWooDraftBridgePreview([
  sourceRow({ condition: '', title: 'Casio GBD-200-9JF New battery installed' }),
  sourceRow({ condition: '', title: 'Casio GBD-200-9JF New model' }),
  sourceRow({ condition: 'Used', title: 'Casio GBD-200-9JF New battery installed' }),
  sourceRow({ condition: 'New' })
], [], { wooFetchComplete: true });
assert.strictEqual(result.excludedRows.length, 1);
assert.strictEqual(result.unresolvedRows.length, 2);
assert.strictEqual(result.newDraftCandidates.length, 1);

for (const condition of ['New', 'Brand New', 'Unused', 'New with tags', 'New without tags', '新品', '未使用']) {
  result = bridge.buildWooDraftBridgePreview([sourceRow({ condition })], [], { wooFetchComplete: true });
  assert.strictEqual(result.newDraftCandidates.length, 1, condition + ' must be accepted');
}

for (const [field, value] of [['model', 'GBD-200-9JF'], ['modelNumber', 'ＧＢＤ－２００－９ＪＦ'], ['model_number', 'GBD 200 9JF']]) {
  result = bridge.buildWooDraftBridgePreview([sourceRow()], [
    Object.assign({ id: field, status: 'publish', sku: '', name: 'No model evidence in name' }, { [field]: value })
  ], { wooFetchComplete: true });
  assert.strictEqual(result.existingWooProducts.length, 1, field + ' must match exactly');
  assert.strictEqual(result.existingWooProducts[0].matchMethod, 'model');
}

result = bridge.buildWooDraftBridgePreview([sourceRow()], [
  { id: 5, status: 'publish', sku: 'GBD-200-9JF', model: 'GBD-200-1JF', name: 'No model evidence in name' }
], { wooFetchComplete: true });
assert.ok(result.errors.some(error => error.includes('wooProducts[0]') && error.includes('conflicting or ambiguous')));
assert.strictEqual(result.readyForDraftSelection, false);
assert.strictEqual(result.firstFiveCandidates.length, 0);

result = bridge.buildWooDraftBridgePreview([sourceRow()], [
  { id: 6, status: 'publish', sku: '', model: 'GBD-200-9JF', modelNumber: 'GBD-200-1JF', name: 'No model evidence in name' }
], { wooFetchComplete: true });
assert.ok(result.errors.some(error => error.includes('wooProducts[0]') && error.includes('conflicting or ambiguous')));
assert.strictEqual(result.readyForDraftSelection, false);
assert.strictEqual(result.firstFiveCandidates.length, 0);

result = bridge.buildWooDraftBridgePreview([
  sourceRow(),
  sourceRow({ model: 'GBD-200-1JF', title: 'Casio GBD-200-1JF Watch' })
], [
  { id: 7, status: 'publish', sku: 'GBD-200-9JF', name: 'Casio GBD-200-1JF New Watch' }
], { wooFetchComplete: true });
assert.ok(result.errors.some(error => error.includes('wooProducts[0]') && error.includes('conflicting or ambiguous')));
assert.strictEqual(result.readyForDraftSelection, false);
assert.strictEqual(result.firstFiveCandidates.length, 0);

result = bridge.buildWooDraftBridgePreview([sourceRow()], [], { wooFetchComplete: false });
assert.strictEqual(result.readyForDraftSelection, false);
assert.strictEqual(result.firstFiveCandidates.length, 0);
result = bridge.buildWooDraftBridgePreview([sourceRow()], [], { wooFetchComplete: true, wooFetchError: 'timeout' });
assert.strictEqual(result.readyForDraftSelection, false);

const invalidWooElements = [
  { label: 'explicit undefined', value: undefined },
  { label: 'null', value: null },
  { label: 'string', value: 'product' },
  { label: 'number', value: 10 },
  { label: 'boolean', value: true },
  { label: 'array', value: [] },
  { label: 'empty object', value: {} },
  { label: 'missing status', value: { sku: 'GBD-200-9JF' } },
  { label: 'invalid status type', value: { status: 10, sku: 'GBD-200-9JF' } },
  { label: 'leading and trailing status whitespace', value: { status: ' publish ', sku: 'GBD-200-9JF' } },
  { label: 'trailing status whitespace', value: { status: 'draft ', sku: 'GBD-200-9JF' } },
  { label: 'tab and newline status whitespace', value: { status: '\tpending\n', sku: 'GBD-200-9JF' } },
  { label: 'uppercase status', value: { status: 'PUBLISH', sku: 'GBD-200-9JF' } },
  { label: 'mixed case status', value: { status: 'Draft', sku: 'GBD-200-9JF' } },
  { label: 'full-width status', value: { status: 'ＰＵＢＬＩＳＨ', sku: 'GBD-200-9JF' } },
  { label: 'empty status', value: { status: '', sku: 'GBD-200-9JF' } },
  { label: 'blank status', value: { status: '   ', sku: 'GBD-200-9JF' } },
  { label: 'null status', value: { status: null, sku: 'GBD-200-9JF' } },
  { label: 'undefined status', value: { status: undefined, sku: 'GBD-200-9JF' } },
  { label: 'boolean status', value: { status: true, sku: 'GBD-200-9JF' } },
  { label: 'array status', value: { status: ['publish'], sku: 'GBD-200-9JF' } },
  { label: 'object status', value: { status: { value: 'publish' }, sku: 'GBD-200-9JF' } },
  { label: 'unsupported status', value: { status: 'private', sku: 'GBD-200-9JF' } },
  { label: 'missing identity', value: { status: 'publish' } },
  { label: 'invalid sku type', value: { status: 'publish', sku: 123 } },
  { label: 'null sku', value: { status: 'publish', sku: null, name: 'Casio GBD-200-9JF' } },
  { label: 'invalid name type', value: { status: 'publish', name: {} } },
  { label: 'undefined name', value: { status: 'publish', name: undefined, sku: 'GBD-200-9JF' } },
  { label: 'null model', value: { status: 'publish', model: null, name: 'Casio GBD-200-9JF' } },
  { label: 'invalid model array', value: { status: 'publish', model: [null] } }
];
for (const fixture of invalidWooElements) {
  const wooInput = [fixture.value];
  const sourceInput = [sourceRow()];
  const sourceBefore = JSON.stringify(sourceInput);
  const wooValueBefore = fixture.value && typeof fixture.value === 'object' ? JSON.stringify(fixture.value) : fixture.value;
  result = bridge.buildWooDraftBridgePreview(sourceInput, wooInput, { wooFetchComplete: true });
  assert.strictEqual(result.readyForDraftSelection, false, fixture.label);
  assert.strictEqual(result.firstFiveCandidates.length, 0, fixture.label);
  assert.ok(result.errors.some(error => error.includes('wooProducts[0]')), fixture.label);
  assert.strictEqual(result.accounting.length, 1, fixture.label);
  assert.strictEqual(result.accountingComplete, true, fixture.label);
  assert.strictEqual(JSON.stringify(sourceInput), sourceBefore, fixture.label);
  if (fixture.value && typeof fixture.value === 'object') {
    assert.strictEqual(JSON.stringify(fixture.value), wooValueBefore, fixture.label);
  } else {
    assert.strictEqual(wooInput[0], fixture.value, fixture.label);
  }
}

const invalidWooIdentities = [
  { label: 'generic name only', product: { status: 'publish', name: 'Generic wristwatch' } },
  { label: 'brand name only', product: { status: 'publish', name: 'Casio watch' } },
  { label: 'descriptive name only', product: { status: 'publish', name: 'Seiko automatic watch' } },
  { label: 'short alphabetic SKU', product: { status: 'publish', sku: 'ABC' } },
  { label: 'numeric SKU', product: { status: 'publish', sku: '12345' } },
  { label: 'generic direct model', product: { status: 'publish', model: 'not-a-model' } },
  { label: 'alphabetic direct model', product: { status: 'publish', model: 'ABCDE' } },
  { label: 'numeric direct model', product: { status: 'publish', model: '12345' } },
  { label: 'all identity fields empty', product: { status: 'publish', sku: '', model: '', modelNumber: '', model_number: '', name: '' } },
  { label: 'multiple name models', sourceModels: ['GBD-200-9JF', 'GBD-200-1JF'], product: { status: 'publish', name: 'Casio GBD-200-9JF and GBD-200-1JF' } },
  { label: 'SKU and direct model conflict', product: { status: 'publish', sku: 'GBD-200-9JF', model: 'GBD-200-1JF' } },
  { label: 'SKU and name conflict', sourceModels: ['GBD-200-9JF', 'GBD-200-1JF'], product: { status: 'publish', sku: 'GBD-200-9JF', name: 'Casio GBD-200-1JF Watch' } },
  { label: 'direct model and name conflict', sourceModels: ['GBD-200-9JF', 'GBD-200-1JF'], product: { status: 'publish', model: 'GBD-200-9JF', name: 'Casio GBD-200-1JF Watch' } },
  { label: 'direct aliases conflict', product: { status: 'publish', model: 'GBD-200-9JF', modelNumber: 'GBD-200-1JF' } },
  { label: 'multiple direct model values', product: { status: 'publish', model: ['GBD-200-9JF', 'GBD-200-1JF'] } },
  { label: 'invalid SKU with valid model', product: { status: 'publish', sku: 'ABC', model: 'GBD-200-9JF' } },
  { label: 'invalid direct model with valid name', product: { status: 'publish', model: 'not-a-model', name: 'Casio GBD-200-9JF Watch' } }
];
for (const fixture of invalidWooIdentities) {
  const wooInput = [fixture.product];
  const wooBefore = JSON.stringify(wooInput);
  const sourceInput = (fixture.sourceModels || ['GBD-200-9JF']).map((model, index) => sourceRow({
    model,
    title: `Casio ${model} Watch`,
    sourceRowNumber: index + 1
  }));
  let invalidIdentityResult;
  assert.doesNotThrow(() => {
    invalidIdentityResult = bridge.buildWooDraftBridgePreview(sourceInput, wooInput, { wooFetchComplete: true });
  }, fixture.label);
  assert.ok(invalidIdentityResult.errors.some(error => error.includes('wooProducts[0]')), fixture.label);
  assert.strictEqual(invalidIdentityResult.readyForDraftSelection, false, fixture.label);
  assert.strictEqual(invalidIdentityResult.firstFiveCandidates.length, 0, fixture.label);
  assert.strictEqual(invalidIdentityResult.accountingComplete, true, fixture.label);
  assert.strictEqual(JSON.stringify(wooInput), wooBefore, fixture.label);
}

const validWooIdentities = [
  { label: 'SKU hyphenated', model: 'GBD-200-9JF', product: { status: 'publish', sku: 'GBD-200-9JF' } },
  { label: 'SKU compact', model: 'SBTR026', brand: 'SEIKO', product: { status: 'publish', sku: 'SBTR026' } },
  { label: 'direct model', model: 'NB1050-59E', brand: 'CITIZEN', product: { status: 'draft', model: 'NB1050-59E' } },
  { label: 'modelNumber', model: 'SBTR026', brand: 'SEIKO', product: { status: 'pending', modelNumber: 'SBTR-026' } },
  { label: 'model_number', model: 'GBD-200-9JF', product: { status: 'publish', model_number: 'GBD2009JF' } },
  { label: 'name Casio', model: 'GBD-200-9JF', product: { status: 'publish', name: 'Casio GBD-200-9JF Wristwatch' } },
  { label: 'name Seiko', model: 'SBTR026', brand: 'SEIKO', product: { status: 'draft', name: 'Seiko SBTR026 Watch' } },
  { label: 'name Citizen', model: 'NB1050-59E', brand: 'CITIZEN', product: { status: 'pending', name: 'Citizen NB1050-59E Wristwatch' } },
  { label: 'same key across fields', model: 'GBD-200-9JF', product: { status: 'publish', sku: 'GBD2009JF', model: 'GBD-200-9JF', name: 'Casio GBD 200 9JF Watch' } },
  { label: 'generic name with SKU', model: 'GBD-200-9JF', product: { status: 'draft', sku: 'GBD-200-9JF', name: 'Generic wristwatch' } },
  { label: 'generic name with direct model', model: 'GBD-200-9JF', product: { status: 'pending', model: 'GBD-200-9JF', name: 'Generic wristwatch' } }
];
for (const fixture of validWooIdentities) {
  const brand = fixture.brand || 'CASIO';
  const source = sourceRow({ brand, model: fixture.model, title: brand + ' ' + fixture.model + ' Watch' });
  result = bridge.buildWooDraftBridgePreview([source], [fixture.product], { wooFetchComplete: true });
  assert.deepStrictEqual(result.errors, [], fixture.label);
  assert.strictEqual(result.existingWooProducts.length, 1, fixture.label);
  assert.strictEqual(result.accountingComplete, true, fixture.label);
}

for (const fixture of [
  { model: 'AE-1200WH-1AV', name: 'Casio AE-1200WH-1AV 10-Year Battery Watch' },
  { model: 'GBD-200-9JF', name: 'Casio GBD-200-9JF 200-Meter Water Resistant Watch' }
]) {
  const extractedKeys = bridge.extractWooDraftBridgeModels_(fixture.name, [fixture.model]).map(bridge.normalizeWooDraftBridgeModelKey_);
  assert.deepStrictEqual(extractedKeys, [bridge.normalizeWooDraftBridgeModelKey_(fixture.model)], `${fixture.name} must ignore specification phrases`);
  result = bridge.buildWooDraftBridgePreview(
    [sourceRow({ model: fixture.model, title: fixture.name })],
    [{ status: 'publish', name: fixture.name }],
    { wooFetchComplete: true }
  );
  assert.deepStrictEqual(result.errors, [], fixture.name);
  assert.strictEqual(result.existingWooProducts.length, 1, fixture.name);
}
for (const specificationPhrase of ['10-Year', '200-Meter', 'Battery-10-Year', 'Water-200-Meter']) {
  assert.deepStrictEqual(bridge.extractWooDraftBridgeModels_(specificationPhrase, ['AE-1200WH-1AV', 'GBD-200-9JF']), [], `${specificationPhrase} is not a source model`);
}
for (const specificationPhrase of ['WR-200M', 'ISO-6425', '20-BAR', '10ATM']) {
  assert.deepStrictEqual(
    bridge.extractWooDraftBridgeModels_(specificationPhrase, ['AE-1200WH-1AV', 'GBD-200-9JF']),
    [],
    `${specificationPhrase} must not become an arbitrary name identity`
  );
}

for (const model of [
  'AE-1200WH-1AV', 'GBD-200-9JF', 'GBD2009JF', 'SBTR026', 'SBTR-026', 'NB1050-59E',
  'GMA-P2100BA-1AJF', 'LCW-M300DB-1AJF', 'EFS-S640PB-1AJF', 'RN-AA0002L', 'RK-AU0110N'
]) {
  const name = `Watch ${model}`;
  const extracted = bridge.extractWooDraftBridgeModels_(name, [model]);
  assert.deepStrictEqual(extracted.map(bridge.normalizeWooDraftBridgeModelKey_), [bridge.normalizeWooDraftBridgeModelKey_(model)], `${model} remains matchable`);
  assert.strictEqual(bridge.wooDraftBridgeNameHasExactModel_(name, model), true, `${model} validator/matcher invariant`);
}
assert.deepStrictEqual(
  bridge.extractWooDraftBridgeModels_('Watch GBD 200 9JF', ['GBD-200-9JF']).map(bridge.normalizeWooDraftBridgeModelKey_),
  ['GBD2009JF'],
  'space-separated source model remains matchable'
);

for (const name of [
  'Casio GBD-200-9JF WR-200M Watch',
  'Casio GBD-200-9JF ISO-6425 Watch'
]) {
  const contextModels = bridge.extractWooDraftBridgeModels_(name, ['GBD-200-9JF']);
  assert.deepStrictEqual(contextModels.map(bridge.normalizeWooDraftBridgeModelKey_), ['GBD2009JF'], `${name} must use only the current source model`);
  result = bridge.buildWooDraftBridgePreview(
    [sourceRow()],
    [{ status: 'publish', name }],
    { wooFetchComplete: true }
  );
  assert.deepStrictEqual(result.errors, [], name);
  assert.strictEqual(result.existingWooProducts.length, 1, name);
}

result = bridge.buildWooDraftBridgePreview(
  [sourceRow()],
  [{ status: 'publish', sku: 'GBD-200-9JF', name: 'Water Resistant WR-200M Watch' }],
  { wooFetchComplete: true }
);
assert.deepStrictEqual(result.errors, [], 'specification-only name must not conflict with a valid explicit SKU');
assert.strictEqual(result.existingWooProducts.length, 1);

result = bridge.buildWooDraftBridgePreview(
  [sourceRow()],
  [{ status: 'publish', name: 'Generic wristwatch WR-200M ISO-6425' }],
  { wooFetchComplete: true }
);
assert.ok(result.errors.some(error => error.includes('wooProducts[0]')), 'a name without a current source model must fail closed');
assert.strictEqual(result.readyForDraftSelection, false);
assert.deepStrictEqual(result.firstFiveCandidates, []);

result = bridge.buildWooDraftBridgePreview(
  [
    sourceRow(),
    sourceRow({ brand: 'SEIKO', model: 'SBTR026', title: 'Seiko SBTR026 Watch' })
  ],
  [{ status: 'publish', name: 'Casio GBD-200-9JF / Seiko SBTR026 Watch' }],
  { wooFetchComplete: true }
);
assert.ok(result.errors.some(error => error.includes('conflicting or ambiguous')), 'a name matching two current source models must fail closed');

result = bridge.buildWooDraftBridgePreview(
  [
    sourceRow(),
    sourceRow({ brand: 'SEIKO', model: 'SBTR026', title: 'Seiko SBTR026 Watch' })
  ],
  [{ status: 'publish', sku: 'GBD-200-9JF', name: 'Seiko SBTR026 Watch' }],
  { wooFetchComplete: true }
);
assert.ok(result.errors.some(error => error.includes('conflicting or ambiguous')), 'an explicit SKU conflicting with a name source model must fail closed');

for (const fixture of [
  { label: 'unsupported brand must not be inferred from title', row: sourceRow({ brand: 'TIMEX', title: 'Casio GBD-200-9JF New Watch' }), classification: 'excludedRows', reason: 'unsupported_brand' },
  { label: 'missing brand must not be inferred from title', row: sourceRow({ brand: '', title: 'Casio GBD-200-9JF New Watch' }), classification: 'unresolvedRows', reason: 'structured_brand_missing' },
  { label: 'conflicting structured brands fail closed', row: sourceRow({ brand: 'CASIO', maker: 'SEIKO' }), classification: 'unresolvedRows', reason: 'structured_brand_conflict' }
]) {
  result = bridge.buildWooDraftBridgePreview([fixture.row], [], { wooFetchComplete: true });
  assert.strictEqual(result[fixture.classification].length, 1, fixture.label);
  assert.strictEqual(result[fixture.classification][0].reason, fixture.reason, fixture.label);
  assert.strictEqual(result.newDraftCandidates.length, 0, fixture.label);
  assert.strictEqual(result.accounting.length, 1, fixture.label);
}
const makerOnlyUnsupported = sourceRow({ maker: 'TIMEX', model: 'SBTR026', title: 'Seiko SBTR026 New Watch' });
delete makerOnlyUnsupported.brand;
makerOnlyUnsupported.descriptionContent.brand = 'TIMEX';
result = bridge.buildWooDraftBridgePreview([makerOnlyUnsupported], [], { wooFetchComplete: true });
assert.strictEqual(result.excludedRows.length, 1, 'unsupported maker must not be replaced by title evidence');
assert.strictEqual(result.excludedRows[0].reason, 'unsupported_brand');
result = bridge.buildWooDraftBridgePreview([sourceRow({ title: 'GBD-200-9JF New Wristwatch' })], [], { wooFetchComplete: true });
assert.strictEqual(result.newDraftCandidates.length, 1, 'structured supported brand is sufficient without title brand text');
result = bridge.buildWooDraftBridgePreview([sourceRow({ brand: 'ＣＡＳＩＯ', maker: 'CASIO', title: 'GBD-200-9JF New Wristwatch' })], [], { wooFetchComplete: true });
assert.strictEqual(result.newDraftCandidates.length, 1, 'equivalent structured brand aliases are accepted after NFKC');
for (const invalidBrand of [null, true, 123, [], {}]) {
  result = bridge.buildWooDraftBridgePreview([sourceRow({ brand: invalidBrand })], [], { wooFetchComplete: true });
  assert.strictEqual(result.unresolvedRows.length, 1, `invalid structured brand ${typeof invalidBrand}`);
  assert.strictEqual(result.unresolvedRows[0].reason, 'structured_brand_invalid');
}

for (const title of ['Casio GBD-200-9JF Resin Band New Watch', 'Stainless Steel Bracelet Watch']) {
  result = bridge.buildWooDraftBridgePreview([sourceRow({ title })], [], { wooFetchComplete: true });
  assert.strictEqual(result.newDraftCandidates.length, 1, `${title} is a wristwatch, not an accessory`);
}
result = bridge.buildWooDraftBridgePreview([sourceRow({ title: 'Replacement Strap', productType: 'WRISTWATCH' })], [], { wooFetchComplete: true });
assert.strictEqual(result.unresolvedRows.length, 1);
assert.strictEqual(result.unresolvedRows[0].reason, 'product_type_title_conflict');
result = bridge.buildWooDraftBridgePreview([sourceRow({ title: 'Replacement Strap', productType: 'ACCESSORY' })], [], { wooFetchComplete: true });
assert.strictEqual(result.excludedRows.length, 1);
assert.strictEqual(result.excludedRows[0].reason, 'non_wristwatch_product_type');

for (const description of ['x', 'Needs human review']) {
  result = bridge.buildWooDraftBridgePreview([sourceRow({ description, descriptionContent: undefined })], [], { wooFetchComplete: true });
  assert.strictEqual(result.unresolvedRows.length, 1, `${description} alone is incomplete`);
  assert.strictEqual(result.newDraftCandidates.length, 0, description);
  assert.strictEqual(result.firstFiveCandidates.length, 0, description);
  assert.ok(result.unresolvedRows[0].missingDescriptionFields.length > 0, description);
}

const descriptionMissingCases = [
  ['model', 'WRONG-100'],
  ['brand', 'SEIKO'],
  ['series', '   '],
  ['series', 'x'],
  ['keyFeatures', ['']],
  ['keyFeatures', ['x']],
  ['condition', 'Used'],
  ['japanDomesticModel', false],
  ['authenticFromJapan', false],
  ['freeInternationalShippingFromJapan', false],
  ['trackingAndCarefulPacking', false],
  ['customsBuyerResponsibility', false],
  ['buyerChecksModelSpecificationsSizeCompatibility', false],
  ['contactBeforeOrdering', false],
  ['humanConfirmationBeforePublish', false]
];
for (const [field, invalidValue] of descriptionMissingCases) {
  const row = sourceRow();
  row.descriptionContent = Object.assign({}, row.descriptionContent, { [field]: invalidValue });
  const before = JSON.stringify(row);
  result = bridge.buildWooDraftBridgePreview([row], [], { wooFetchComplete: true });
  assert.strictEqual(result.unresolvedRows.length, 1, field);
  assert.ok(result.unresolvedRows[0].missingDescriptionFields.includes(`descriptionContent.${field}`), field);
  assert.strictEqual(result.newDraftCandidates.length, 0, field);
  assert.strictEqual(result.firstFiveCandidates.length, 0, field);
  assert.strictEqual(result.accountingComplete, true, field);
  assert.strictEqual(JSON.stringify(row), before, `${field} input must not be changed`);
}
result = bridge.buildWooDraftBridgePreview([sourceRow()], [], { wooFetchComplete: true });
assert.strictEqual(result.newDraftCandidates.length, 1, 'complete description content is eligible');
assert.deepStrictEqual(result.newDraftCandidates[0].missingDescriptionFields, []);

const expectedDescriptionFragments = [
  'Model: GBD-200-9JF',
  'Brand: CASIO',
  'Series: Watch series',
  'Key features: Watch feature',
  'Condition: New / unused.',
  'Japan domestic model / JDM.',
  'Authentic product sourced from Japan.',
  'Free international shipping from Japan.',
  'Tracking and careful packing are included.',
  "Customs / import duties are the buyer's responsibility where applicable.",
  'check the model number, specifications, size, and compatibility',
  'contact the store before ordering if there are questions',
  'Human confirmation is required before publish.'
];
for (const sourceDescription of ['x', 'Needs human review', completeDescription('GBD-200-9JF', 'CASIO')]) {
  const descriptionRow = sourceRow({ description: sourceDescription });
  const before = JSON.stringify(descriptionRow);
  result = bridge.buildWooDraftBridgePreview([descriptionRow], [], { wooFetchComplete: true });
  assert.strictEqual(result.newDraftCandidates.length, 1, `${sourceDescription} with complete structured evidence is eligible`);
  const candidate = result.newDraftCandidates[0];
  assert.strictEqual(candidate.sourceDescription, sourceDescription);
  assert.notStrictEqual(candidate.description, sourceDescription, 'raw source description must not be trusted as the completed preview description');
  for (const fragment of expectedDescriptionFragments) {
    assert.ok(candidate.description.includes(fragment), `generated description must include: ${fragment}`);
  }
  assert.strictEqual(JSON.stringify(descriptionRow), before, 'description generation must not mutate source input');
}

const noRawDescription = sourceRow({ description: undefined });
result = bridge.buildWooDraftBridgePreview([noRawDescription], [], { wooFetchComplete: true });
assert.strictEqual(result.newDraftCandidates.length, 1, 'raw description is not completion evidence when structured content is complete');
assert.ok(result.newDraftCandidates[0].description.includes('Model: GBD-200-9JF'));

result = bridge.buildWooDraftBridgePreview(
  [sourceRow({ description: undefined, descriptionContent: undefined })],
  [{ status: 'publish', sku: 'GBD-200-9JF' }],
  { wooFetchComplete: true }
);
assert.strictEqual(result.existingWooProducts.length, 1, 'Draft description evidence must not block a confirmed existing Woo match');

const sparseWoo = new Array(1);
result = bridge.buildWooDraftBridgePreview([sourceRow()], sparseWoo, { wooFetchComplete: true });
assert.strictEqual(result.readyForDraftSelection, false);
assert.strictEqual(result.firstFiveCandidates.length, 0);
assert.ok(result.errors.some(error => error.includes('wooProducts[0]') && error.includes('sparse')));
assert.strictEqual(result.accounting.length, 1);
assert.strictEqual(result.accountingComplete, true);
assert.strictEqual(Object.prototype.hasOwnProperty.call(sparseWoo, 0), false);

const middleSparseWoo = [
  { status: 'publish', sku: 'GBD-200-1JF' },
  { status: 'draft', sku: 'GBD-200-2JF' },
  { status: 'pending', sku: 'GBD-200-3JF' }
];
delete middleSparseWoo[1];
result = bridge.buildWooDraftBridgePreview([sourceRow()], middleSparseWoo, { wooFetchComplete: true });
assert.strictEqual(result.readyForDraftSelection, false);
assert.strictEqual(result.firstFiveCandidates.length, 0);
assert.ok(result.errors.some(error => error.includes('wooProducts[1]') && error.includes('sparse')));
assert.strictEqual(result.accounting.length, 1);
assert.strictEqual(result.accountingComplete, true);
assert.strictEqual(Object.prototype.hasOwnProperty.call(middleSparseWoo, 1), false);

const mixedWoo = [
  { status: 'publish', sku: 'GBD-200-9JF' },
  null,
  { status: 'draft', sku: 'GBD-200-1JF' }
];
const mixedWooBefore = JSON.stringify(mixedWoo);
result = bridge.buildWooDraftBridgePreview([sourceRow()], mixedWoo, { wooFetchComplete: true });
assert.strictEqual(result.readyForDraftSelection, false);
assert.strictEqual(result.firstFiveCandidates.length, 0);
assert.ok(result.errors.some(error => error.includes('wooProducts[1]')));
assert.strictEqual(result.accounting.length, 1);
assert.strictEqual(result.accountingComplete, true);
assert.strictEqual(JSON.stringify(mixedWoo), mixedWooBefore);

result = bridge.buildWooDraftBridgePreview([
  sourceRow({ model: 'GBD-200-1JF', title: 'Casio GBD-200-1JF Watch' }),
  sourceRow({ model: 'GBD-200-2JF', title: 'Casio GBD-200-2JF Watch' }),
  sourceRow({ model: 'GBD-200-3JF', title: 'Casio GBD-200-3JF Watch' })
], [null], { wooFetchComplete: true });
assert.strictEqual(result.readyForDraftSelection, false);
assert.strictEqual(result.firstFiveCandidates.length, 0);
assert.strictEqual(result.accounting.length, 3);
assert.strictEqual(result.accountingComplete, true);

result = bridge.buildWooDraftBridgePreview([sourceRow()], [], { wooFetchComplete: true });
assert.strictEqual(result.errors.length, 0, 'a confirmed complete empty Woo snapshot is valid');
assert.strictEqual(result.readyForDraftSelection, true);
assert.strictEqual(result.newDraftCandidates.length, 1);

for (const status of ['publish', 'draft', 'pending']) {
  const wooProduct = { id: status, status, sku: 'GBD-200-9JF', name: '' };
  const wooBefore = JSON.stringify(wooProduct);
  result = bridge.buildWooDraftBridgePreview([sourceRow()], [wooProduct], { wooFetchComplete: true });
  assert.strictEqual(result.errors.length, 0, status);
  assert.strictEqual(result.existingWooProducts.length, 1, status);
  assert.strictEqual(result.existingWooByStatus[status].length, 1, status);
  assert.strictEqual(result.existingWooByStatus[status][0].product, wooProduct, status);
  assert.strictEqual(JSON.stringify(wooProduct), wooBefore, status);
}

for (const [condition, itemCondition] of [['New', 'Used'], ['Used', 'New']]) {
  result = bridge.buildWooDraftBridgePreview([sourceRow({ condition, itemCondition })], [], { wooFetchComplete: true });
  assert.strictEqual(result.newDraftCandidates.length, 0);
  assert.strictEqual(result.unresolvedRows.length, 1);
  assert.strictEqual(result.unresolvedRows[0].reason, 'condition_alias_conflict');
  assert.strictEqual(result.accountingComplete, true);
  assert.deepStrictEqual(result.firstFiveCandidates, []);
}

for (const [condition, itemCondition] of [['New', 'NEW'], ['Brand New', 'BRAND NEW']]) {
  result = bridge.buildWooDraftBridgePreview([sourceRow({ condition, itemCondition })], [], { wooFetchComplete: true });
  assert.strictEqual(result.newDraftCandidates.length, 1);
  assert.strictEqual(result.unresolvedRows.length, 0);
  assert.strictEqual(result.accountingComplete, true);
}

for (const invalidAlias of ['', '   ', null, 1, true, {}]) {
  result = bridge.buildWooDraftBridgePreview([sourceRow({ condition: 'New', itemCondition: invalidAlias })], [], { wooFetchComplete: true });
  assert.strictEqual(result.newDraftCandidates.length, 0);
  assert.strictEqual(result.unresolvedRows.length, 1);
  assert.strictEqual(result.unresolvedRows[0].reason, 'condition_alias_invalid');
  assert.strictEqual(result.accountingComplete, true);
  assert.deepStrictEqual(result.firstFiveCandidates, []);
}

function assertDuplicatePromotion(rows, expectedUnresolved, expectedDuplicates, label) {
  const before = JSON.parse(JSON.stringify(rows));
  const promoted = bridge.buildWooDraftBridgePreview(rows, [], { wooFetchComplete: true });
  assert.strictEqual(promoted.newDraftCandidates.length, 1, label);
  assert.strictEqual(promoted.unresolvedRows.length, expectedUnresolved, label);
  assert.strictEqual(promoted.duplicates.length, expectedDuplicates, label);
  assert.strictEqual(promoted.accounting.length, rows.length, label);
  assert.strictEqual(promoted.accountingComplete, true, label);
  assert.strictEqual(promoted.firstFiveCandidates.length, 1, label);
  assert.deepStrictEqual(rows, before, label + ' input unchanged');
}

assertDuplicatePromotion([
  sourceRow({ model: 'GBD-200-3JF', price: '' }),
  sourceRow({ model: 'GBD-200-3JF' })
], 1, 0, 'incomplete price then complete');
assertDuplicatePromotion([
  sourceRow({ model: 'GBD-200-4JF', images: [] }),
  sourceRow({ model: 'GBD-200-4JF' })
], 1, 0, 'incomplete images then complete');
assertDuplicatePromotion([
  sourceRow({ model: 'GBD-200-5JF', descriptionContent: null }),
  sourceRow({ model: 'GBD-200-5JF' })
], 1, 0, 'incomplete description then complete');
assertDuplicatePromotion([
  sourceRow({ model: 'GBD-200-6JF' }),
  sourceRow({ model: 'GBD-200-6JF', price: '' })
], 0, 1, 'complete then incomplete duplicate');
assertDuplicatePromotion([
  sourceRow({ model: 'GBD-200-7JF', price: '' }),
  sourceRow({ model: 'GBD-200-7JF' }),
  sourceRow({ model: 'GBD-200-7JF' })
], 1, 1, 'incomplete then complete then duplicate');

result = bridge.buildWooDraftBridgePreview([
  sourceRow({ model: 'GBD-200-8JF', price: '' }),
  sourceRow({ model: 'GBD-200-8JF', images: [] })
], [], { wooFetchComplete: true });
assert.strictEqual(result.newDraftCandidates.length, 0);
assert.strictEqual(result.unresolvedRows.length, 2);
assert.strictEqual(result.duplicates.length, 0);
assert.strictEqual(result.accountingComplete, true);
assert.deepStrictEqual(result.firstFiveCandidates, []);

const fixtureCount = 550;
const largeFixture = Array.from({ length: fixtureCount }, (_, index) => sourceRow({
  brand: 'SEIKO', model: `SBTR${String(index + 100).padStart(3, '0')}`,
  title: `Seiko SBTR${String(index + 100).padStart(3, '0')} New Watch`, productType: 'WRISTWATCH', sourceRowNumber: index + 2
}));
result = bridge.buildWooDraftBridgePreview(largeFixture, [], { wooFetchComplete: true });
assert.strictEqual(result.sourceRows, fixtureCount);
assert.strictEqual(result.accounting.length, fixtureCount);
assert.strictEqual(result.accountingComplete, true);
assert.strictEqual(result.newDraftCandidates.length, fixtureCount);
assert.strictEqual(result.firstFiveCandidates.length, 5);

const previewSource = fs.readFileSync(path.join(__dirname, '..', 'woo_draft_bridge.gs'), 'utf8');
assert.strictEqual(/createWooCommerceProduct\s*\(/.test(previewSource), false);
assert.strictEqual(/callWooCommerceApi_\s*\(/.test(previewSource), false);
assert.strictEqual(/UrlFetchApp|SpreadsheetApp|PropertiesService/.test(previewSource), false);
assert.strictEqual(/["'](?:post|put|delete)["']/i.test(previewSource), false);

console.log(`Woo Draft Bridge preview tests PASS; fixture rows=${fixtureCount}; accounted=${result.accounting.length}.`);
