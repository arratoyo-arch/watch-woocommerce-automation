#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const allowedForbiddenExplanationFiles = new Set([
  'README.md',
  'AGENTS.md',
  path.join('docs', 'REPO_BOUNDARY.md'),
  path.join('scripts', 'check_repo_boundary.js')
]);

const ignoredDirs = new Set(['.git', 'node_modules', '.clasp', 'dist', 'build', 'coverage']);
const forbiddenPatterns = [
  'eBay Trading API',
  'Active_listing',
  'Listing_plan',
  'Price_Up_Candidates',
  'Sell Similar',
  'Revise Price',
  'Ebay_New_Listing_Candidates',
  'Ebay_Restock_Candidates',
  'buildPriceUpCandidates',
  'buildEbayUnlistedModelCandidates',
  'buildEbayNewListingCandidates'
];

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
}

function isProbablyTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ['', '.js', '.gs', '.md', '.json', '.txt', '.yml', '.yaml'].includes(ext);
}

function findForbiddenMatches(filePath, relativePath) {
  if (allowedForbiddenExplanationFiles.has(relativePath)) return [];
  if (!isProbablyTextFile(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const matches = [];

  lines.forEach((line, index) => {
    forbiddenPatterns.forEach((pattern) => {
      if (line.includes(pattern)) {
        matches.push({ line: index + 1, pattern, text: line.trim() });
      }
    });
  });

  return matches;
}

const files = [];
walk(repoRoot, files);

const violations = [];
for (const filePath of files) {
  const relativePath = path.relative(repoRoot, filePath);
  const matches = findForbiddenMatches(filePath, relativePath);
  matches.forEach((match) => violations.push({ relativePath, ...match }));
}

if (violations.length > 0) {
  console.error('Repository boundary check failed. Forbidden eBay seller-operation terms were found outside allowed policy docs.');
  violations.forEach((violation) => {
    console.error(`- ${violation.relativePath}:${violation.line} [${violation.pattern}] ${violation.text}`);
  });
  process.exit(1);
}

console.log('Repository boundary check passed. No forbidden eBay seller-operation terms found outside allowed policy docs.');
