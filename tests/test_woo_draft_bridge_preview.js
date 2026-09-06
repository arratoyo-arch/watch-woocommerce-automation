#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const bridge = require('../woo_draft_bridge.gs');

function sourceRow(overrides) {
  return Object.assign({
    brand: 'CASIO', model: 'GBD-200-9JF', title: 'Casio GBD-200-9JF New Watch', condition: 'New',
    productType: 'WRISTWATCH',
    price: '199', images: ['read-only-image-reference'], description: 'Needs human review',
    categories: ['Watches'], tags: ['JDM'], stockPolicy: 'Human confirmation required',
    shippingPolicy: 'Free international shipping from Japan with tracking'
  }, overrides || {});
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

result = bridge.buildWooDraftBridgePreview([sourceRow()], [
  { id: 'multi-name-models', status: 'publish', sku: '', name: 'Casio GBD2009JF alternative GBD-200-1JF' }
], { wooFetchComplete: true });
assert.strictEqual(result.unresolvedRows[0].reason, 'woo_identity_conflict');
assert.ok(result.unresolvedRows[0].matchedProducts[0].conflicts.includes('multiple_name_model_values'));
assert.strictEqual(result.readyForDraftSelection, false);

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
assert.strictEqual(result.invalidModels.length, 1);
assert.strictEqual(result.unresolvedRows.length, 2);

result = bridge.buildWooDraftBridgePreview([
  sourceRow({ condition: 'Used' }),
  sourceRow({ title: 'Casio replacement parts New' }),
  sourceRow({ title: 'Casio replacement band New' }),
  sourceRow({ title: 'Casio watch accessory New' })
], [], { wooFetchComplete: true });
assert.strictEqual(result.excludedRows.length, 4);

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
assert.deepStrictEqual(result.unresolvedRows[0].missingFields, ['price', 'images', 'description', 'categories', 'tags', 'stockPolicy', 'shippingPolicy']);
assert.strictEqual(result.unresolvedRows[0].reason, 'required_candidate_fields_missing');
assert.deepStrictEqual(result.accounting, [{ sourceIndex: 0, classification: 'unresolvedRows' }]);
assert.strictEqual(result.accountingComplete, true);

const invalidRequiredFixtures = [
  { price: '   ', images: [''], description: ' ', categories: [''], tags: [' '], stockPolicy: ' ' },
  { price: '\t\n　', images: ['   '], description: '\t\n　', categories: [null], tags: [null], stockPolicy: '\t' },
  { images: [null] }, { images: [{}] }, { images: [{ src: '   ' }] },
  { categories: [''] }, { categories: [null] }, { tags: ['   '] },
  { price: '0' }, { price: 0 }, { price: '-1' }, { price: 'NaN' },
  { price: Infinity }, { price: {} }, { description: '   ' }, { stockPolicy: '\t' }
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
assert.strictEqual(result.excludedRows.length, 3);
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
assert.strictEqual(result.unresolvedRows[0].reason, 'woo_identity_conflict');
assert.strictEqual(result.readyForDraftSelection, false);

result = bridge.buildWooDraftBridgePreview([sourceRow()], [
  { id: 6, status: 'publish', sku: '', model: 'GBD-200-9JF', modelNumber: 'GBD-200-1JF', name: 'No model evidence in name' }
], { wooFetchComplete: true });
assert.strictEqual(result.unresolvedRows[0].reason, 'woo_identity_conflict');
assert.ok(result.unresolvedRows[0].matchedProducts[0].conflicts.includes('multiple_explicit_model_values'));
assert.strictEqual(result.readyForDraftSelection, false);

result = bridge.buildWooDraftBridgePreview([sourceRow()], [
  { id: 7, status: 'publish', sku: 'GBD-200-9JF', name: 'Casio GBD-200-1JF New Watch' }
], { wooFetchComplete: true });
assert.strictEqual(result.unresolvedRows[0].reason, 'woo_identity_conflict');
assert.ok(result.unresolvedRows[0].matchedProducts[0].conflicts.includes('name_model_conflicts_with_matched_identity'));
assert.strictEqual(result.readyForDraftSelection, false);

result = bridge.buildWooDraftBridgePreview([sourceRow()], [], { wooFetchComplete: false });
assert.strictEqual(result.readyForDraftSelection, false);
assert.strictEqual(result.firstFiveCandidates.length, 0);
result = bridge.buildWooDraftBridgePreview([sourceRow()], [], { wooFetchComplete: true, wooFetchError: 'timeout' });
assert.strictEqual(result.readyForDraftSelection, false);

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
