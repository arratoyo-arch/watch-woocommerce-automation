#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const bridge = require('../woo_draft_bridge.gs');

function sourceRow(overrides) {
  return Object.assign({
    brand: 'CASIO', model: 'GBD-200-9JF', title: 'Casio GBD-200-9JF New Watch', condition: 'New',
    price: '199', images: ['read-only-image-reference'], description: 'Needs human review',
    categories: ['Watches'], tags: ['JDM'], stockPolicy: 'Human confirmation required'
  }, overrides || {});
}

assert.strictEqual(bridge.normalizeWooDraftBridgeModelKey_(' ＧＢＤ－２００ ‐ ９ｊｆ '), 'GBD2009JF');

const matchingModels = ['GBD-200-9JF', 'RN-AA0811E', 'SBTR026', 'NB1050-59E', 'VO10-6741F', 'WVA-M630D-2AJF'];
for (const model of matchingModels) {
  assert.strictEqual(bridge.wooDraftBridgeNameHasExactModel_(`Authentic ${model} New Watch`, model), true, `${model} exact name evidence`);
}
assert.strictEqual(bridge.wooDraftBridgeNameHasExactModel_('ＣＡＳＩＯ ＧＢＤ－２００—９ＪＦ New Watch', 'GBD-200-9JF'), true);
assert.strictEqual(bridge.wooDraftBridgeNameHasExactModel_('Casio GBD 200 9JF New Watch', 'GBD-200-9JF'), true);

const nonMatches = [
  ['DW-5600E-1JF', 'DW-5600-1JF'],
  ['SHS-4529D-7AJF', 'SHS-4529D-7AJ'],
  ['BGD-5650-1JF', 'BGD-565'],
  ['RN-AA0002L', 'RN-AA0002'],
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

result = bridge.buildWooDraftBridgePreview([sourceRow({ price: '', images: [], description: '', categories: [], tags: [], stockPolicy: '' })], [], { wooFetchComplete: true });
assert.strictEqual(result.missingPrices.length, 1);
assert.strictEqual(result.missingImages.length, 1);
assert.strictEqual(result.newDraftCandidates.length, 0);
assert.strictEqual(result.firstFiveCandidates.length, 0);
assert.strictEqual(result.unresolvedRows.length, 1);
assert.deepStrictEqual(result.unresolvedRows[0].missingFields, ['price', 'images', 'description', 'categories', 'tags', 'stockPolicy']);
assert.strictEqual(result.unresolvedRows[0].reason, 'required_candidate_fields_missing');
assert.deepStrictEqual(result.accounting, [{ sourceIndex: 0, classification: 'unresolvedRows' }]);
assert.strictEqual(result.accountingComplete, true);

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
  title: `Seiko SBTR${String(index + 100).padStart(3, '0')} New Watch`, sourceRowNumber: index + 2
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
