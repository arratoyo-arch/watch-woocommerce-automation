var WC_ACCESS_RANKING_TOP5_SHEET_NAME = 'WC_Access_Ranking_Top5';
var WC_ACCESS_RANKING_TOP5_LIMIT = 5;
var WC_ACCESS_RANKING_ORDER_LOOKBACK_DAYS = 30;
var WC_ACCESS_RANKING_PRODUCT_FETCH_LIMIT = 100;

var WC_ACCESS_RANKING_HEADERS = [
  'Date',
  'Rank',
  'SKU',
  'Model',
  'ProductName',
  'ProductID',
  'ProductURL',
  'Status',
  'StockStatus',
  'Price',
  'TotalSales',
  'RecentOrders',
  'Views',
  'AddToCart',
  'Revenue',
  'Score',
  '判定',
  '次のアクション',
  '備考'
];

/**
 * Builds a WooCommerce-only access / sales priority Top 5 dashboard.
 *
 * Phase 1 works with WooCommerce products and recent orders only. Phase 2 can
 * merge GA4 or Jetpack Stats metrics later without changing the output sheet.
 */
function buildWooAccessRankingTop5() {
  var products = fetchWooAccessRankingProducts_();
  var orderMetrics = fetchWooAccessRankingRecentOrderMetrics_();
  var accessMetrics = fetchWooAccessRankingAccessMetrics_();
  var rankedRows = buildWooAccessRankingRows_(products, orderMetrics, accessMetrics)
    .sort(function(a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (b.totalSales !== a.totalSales) return b.totalSales - a.totalSales;
      if (b.recentOrders !== a.recentOrders) return b.recentOrders - a.recentOrders;
      return String(a.productName).localeCompare(String(b.productName));
    })
    .slice(0, WC_ACCESS_RANKING_TOP5_LIMIT);

  writeWooAccessRankingTop5Sheet_(rankedRows);

  Logger.log(WC_ACCESS_RANKING_TOP5_SHEET_NAME + ' 作成完了: ' + rankedRows.length + '件');
  return rankedRows;
}

/**
 * Daily entry point for the WooCommerce Access Ranking Top 5 dashboard.
 */
function runWooAccessRankingDaily() {
  return buildWooAccessRankingTop5();
}

/**
 * Daily entry point with optional Slack notification. Slack failures never stop
 * ranking creation.
 */
function runWooAccessRankingDailyWithSlack() {
  var rows = buildWooAccessRankingTop5();

  try {
    sendWooAccessRankingTop5SlackIfAvailable_(rows);
  } catch (error) {
    Logger.log('Slack通知をスキップしました: ' + error.message);
  }

  return rows;
}

/**
 * Safe manual test for ranking creation.
 */
function testBuildWooAccessRankingTop5() {
  var rows = buildWooAccessRankingTop5();
  Logger.log('testBuildWooAccessRankingTop5 完了: ' + rows.length + '件');
  return rows;
}

function fetchWooAccessRankingProducts_() {
  var products = [];
  var page = 1;
  var perPage = WC_ACCESS_RANKING_PRODUCT_FETCH_LIMIT;

  while (true) {
    var pageProducts = fetchWooCommerceProducts({
      status: 'any',
      per_page: perPage,
      page: page,
      orderby: 'date',
      order: 'desc'
    });

    if (!pageProducts || pageProducts.length === 0) {
      break;
    }

    products = products.concat(pageProducts);

    if (pageProducts.length < perPage) {
      break;
    }

    page += 1;
    Utilities.sleep(200);
  }

  return products;
}

function fetchWooAccessRankingRecentOrderMetrics_() {
  var metricsByProductId = {};
  var page = 1;
  var perPage = 100;
  var after = new Date();
  after.setDate(after.getDate() - WC_ACCESS_RANKING_ORDER_LOOKBACK_DAYS);

  while (true) {
    var orders = callWooCommerceApi_('orders', {
      status: 'processing,completed,on-hold',
      per_page: perPage,
      page: page,
      after: after.toISOString(),
      orderby: 'date',
      order: 'desc'
    }, 'get');

    if (!orders || orders.length === 0) {
      break;
    }

    orders.forEach(function(order) {
      var lineItems = order.line_items || [];
      lineItems.forEach(function(item) {
        var productId = item.product_id;
        if (!productId) {
          return;
        }

        if (!metricsByProductId[productId]) {
          metricsByProductId[productId] = { recentOrders: 0, revenue: 0 };
        }

        metricsByProductId[productId].recentOrders += Number(item.quantity) || 0;
        metricsByProductId[productId].revenue += Number(item.total) || 0;
      });
    });

    if (orders.length < perPage) {
      break;
    }

    page += 1;
    Utilities.sleep(200);
  }

  return metricsByProductId;
}

function fetchWooAccessRankingAccessMetrics_() {
  var props = PropertiesService.getScriptProperties();
  var ga4PropertyId = trimString_(props.getProperty('GA4_PROPERTY_ID'));

  if (!ga4PropertyId) {
    Logger.log('GA4_PROPERTY_ID未設定のためWooデータのみでランキング作成');
    return {};
  }

  return fetchWooAccessRankingGa4Metrics_(ga4PropertyId);
}

function fetchWooAccessRankingGa4Metrics_(ga4PropertyId) {
  try {
    if (typeof AnalyticsData === 'undefined' || !AnalyticsData.Properties || !AnalyticsData.Properties.runReport) {
      Logger.log('GA4_PROPERTY_IDは設定済みですがAnalytics Data APIが利用できないためWooデータのみでランキング作成');
      return {};
    }

    var request = {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [
        { name: 'pagePath' },
        { name: 'pageTitle' }
      ],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'addToCarts' },
        { name: 'purchaseRevenue' }
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: { matchType: 'CONTAINS', value: '/product/' }
        }
      },
      limit: 1000
    };

    var report = AnalyticsData.Properties.runReport(request, 'properties/' + ga4PropertyId);
    return convertWooAccessRankingGa4Report_(report);
  } catch (error) {
    Logger.log('GA4取得をスキップしました: ' + error.message);
    return {};
  }
}

function convertWooAccessRankingGa4Report_(report) {
  var metricsByUrlKey = {};
  var rows = report && report.rows ? report.rows : [];

  rows.forEach(function(row) {
    var dimensionValues = row.dimensionValues || [];
    var metricValues = row.metricValues || [];
    var pagePath = dimensionValues[0] ? dimensionValues[0].value : '';
    var key = normalizeWooAccessRankingUrlKey_(pagePath);

    if (!key) {
      return;
    }

    metricsByUrlKey[key] = {
      views: Number(metricValues[0] && metricValues[0].value) || 0,
      addToCart: Number(metricValues[1] && metricValues[1].value) || 0,
      revenue: Number(metricValues[2] && metricValues[2].value) || 0
    };
  });

  return metricsByUrlKey;
}

function buildWooAccessRankingRows_(products, orderMetrics, accessMetrics) {
  return (products || []).map(function(product) {
    var productId = product.id;
    var permalink = trimString_(product.permalink);
    var urlKey = normalizeWooAccessRankingUrlKey_(permalink);
    var byOrder = orderMetrics[productId] || { recentOrders: 0, revenue: 0 };
    var byAccess = accessMetrics[urlKey] || { views: 0, addToCart: 0, revenue: 0 };
    var totalSales = Number(product.total_sales) || 0;
    var recentOrders = Number(byOrder.recentOrders) || 0;
    var views = Number(byAccess.views) || 0;
    var addToCart = Number(byAccess.addToCart) || 0;
    var revenue = (Number(byOrder.revenue) || 0) + (Number(byAccess.revenue) || 0);
    var score = calculateWooAccessRankingScore_(product, totalSales, recentOrders, views, addToCart);
    var judgement = judgeWooAccessRankingRow_(product, totalSales, recentOrders, views, score);

    return {
      date: new Date(),
      sku: trimString_(product.sku),
      model: guessWooAccessRankingModel_(product),
      productName: trimString_(product.name),
      productId: productId,
      productUrl: permalink,
      status: trimString_(product.status),
      stockStatus: trimString_(product.stock_status),
      price: trimString_(product.price || product.regular_price),
      totalSales: totalSales,
      recentOrders: recentOrders,
      views: views,
      addToCart: addToCart,
      revenue: revenue,
      score: score,
      judgement: judgement.label,
      nextAction: judgement.nextAction,
      note: judgement.note
    };
  });
}

function calculateWooAccessRankingScore_(product, totalSales, recentOrders, views, addToCart) {
  var score = 0;

  if (totalSales > 0) score += 50;
  if (recentOrders > 0) score += 80;
  if (trimString_(product.stock_status) === 'outofstock') score += 60;
  if (trimString_(product.status) === 'publish') score += 20;
  if (trimString_(product.status) === 'draft') score -= 20;
  if (!trimString_(product.price || product.regular_price)) score -= 30;
  if (trimString_(product.permalink)) score += 10;

  score += Number(views) || 0;
  score += (Number(addToCart) || 0) * 5;

  return score;
}

function judgeWooAccessRankingRow_(product, totalSales, recentOrders, views, score) {
  var status = trimString_(product.status);
  var stockStatus = trimString_(product.stock_status);
  var hasSales = totalSales > 0 || recentOrders > 0;
  var hasPrice = !!trimString_(product.price || product.regular_price);
  var hasImages = product.images && product.images.length > 0;
  var hasDescription = !!trimString_(stripHtml_(product.description || product.short_description || ''));

  if (status === 'publish' && hasSales && stockStatus === 'instock') {
    return {
      label: 'KEEP_ACTIVE',
      nextAction: '在庫・価格を確認し、売れ筋として維持する',
      note: '公開中で売上があり在庫あり。毎朝の確認対象。'
    };
  }

  if (hasSales && stockStatus === 'outofstock') {
    return {
      label: 'RESTOCK_OR_UPDATE',
      nextAction: '在庫補充または在庫表示の更新を確認する',
      note: '売上実績があるが在庫切れ。売り逃し防止の確認対象。'
    };
  }

  if (status === 'draft' && (hasSales || score >= 80)) {
    return {
      label: 'DRAFT_TO_PUBLISH_CHECK',
      nextAction: '公開前に価格・在庫・画像・説明を人間が確認する',
      note: 'draftだが売れ筋候補。自動公開はしない。'
    };
  }

  if ((views > 0 && !hasSales) || !hasPrice || !hasImages || !hasDescription) {
    return {
      label: 'IMPROVE_PRODUCT_PAGE',
      nextAction: '価格・画像・説明・商品URLを確認してページ改善する',
      note: '閲覧あり売上なし、または商品情報不足の可能性。'
    };
  }

  return {
    label: 'WATCH_ONLY',
    nextAction: '低反応のため経過観察する',
    note: '現時点では大きな対応不要。'
  };
}

function writeWooAccessRankingTop5Sheet_(rows) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(WC_ACCESS_RANKING_TOP5_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(WC_ACCESS_RANKING_TOP5_SHEET_NAME);
  }

  sheet.clearContents();
  sheet.getRange(1, 1, 1, WC_ACCESS_RANKING_HEADERS.length).setValues([WC_ACCESS_RANKING_HEADERS]);

  if (rows.length > 0) {
    var values = rows.map(function(row, index) {
      return [
        row.date,
        index + 1,
        row.sku,
        row.model,
        row.productName,
        row.productId,
        row.productUrl,
        row.status,
        row.stockStatus,
        row.price,
        row.totalSales,
        row.recentOrders,
        row.views,
        row.addToCart,
        row.revenue,
        row.score,
        row.judgement,
        row.nextAction,
        row.note
      ];
    });

    sheet.getRange(2, 1, values.length, WC_ACCESS_RANKING_HEADERS.length).setValues(values);
    sheet.getRange(2, 1, values.length, 1).setNumberFormat('yyyy/mm/dd');
    sheet.getRange(2, 10, values.length, 1).setNumberFormat('0.00');
    sheet.getRange(2, 15, values.length, 1).setNumberFormat('0.00');
  }

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, WC_ACCESS_RANKING_HEADERS.length);
}

function sendWooAccessRankingTop5SlackIfAvailable_(rows) {
  var message = buildWooAccessRankingSlackMessage_(rows);
  var sender = findWooAccessRankingSlackSender_();

  if (!sender) {
    Logger.log('既存のSlack送信関数が見つからないためSlack通知をスキップしました');
    return false;
  }

  sender(message);
  return true;
}

function findWooAccessRankingSlackSender_() {
  var names = [
    'sendSlackMessage',
    'sendSlackNotification',
    'postSlackMessage',
    'postToSlack'
  ];

  for (var i = 0; i < names.length; i++) {
    if (typeof globalThis !== 'undefined' && typeof globalThis[names[i]] === 'function') {
      return globalThis[names[i]];
    }
  }

  return null;
}

function buildWooAccessRankingSlackMessage_(rows) {
  var lines = ['【WooCommerce Access Ranking Top5】'];

  if (!rows || rows.length === 0) {
    lines.push('対象商品なし');
    return lines.join('\n');
  }

  rows.forEach(function(row, index) {
    lines.push(
      (index + 1) + '. ' +
      (row.sku || '-') + ' / ' +
      row.productName + ' / ' +
      row.score + ' / ' +
      row.judgement + ' / ' +
      row.nextAction
    );
  });

  return lines.join('\n');
}

function guessWooAccessRankingModel_(product) {
  var source = [product.sku, product.name, product.slug].join(' ').toUpperCase();
  var patterns = [
    /\b[A-Z]{2,5}-[A-Z0-9]{3,8}-[A-Z0-9]{1,5}\b/g,
    /\b[A-Z]{2,5}-[A-Z0-9]{4,10}\b/g,
    /\b[A-Z]{3,6}[0-9]{3,5}[A-Z0-9-]*\b/g
  ];

  for (var i = 0; i < patterns.length; i++) {
    var matches = source.match(patterns[i]);
    if (matches && matches.length > 0) {
      return matches[0];
    }
  }

  return trimString_(product.sku) || '要確認';
}

function normalizeWooAccessRankingUrlKey_(value) {
  var text = trimString_(value);
  if (!text) {
    return '';
  }

  text = text.replace(/^https?:\/\/[^/]+/i, '');
  text = text.split('?')[0].split('#')[0];
  return text.replace(/\/+$/, '').toLowerCase();
}
