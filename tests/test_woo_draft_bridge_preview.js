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
assert.deepStrictEqual(result.newDraftCandidates[0].missingFields, ['price', 'images', 'description', 'categories', 'tags', 'stockPolicy']);

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
