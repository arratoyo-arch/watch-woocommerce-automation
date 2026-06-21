/**
 * Returns WooCommerce API configuration from Script Properties.
 *
 * Required Script Properties:
 * - WOO_BASE_URL
 * - WOO_CONSUMER_KEY
 * - WOO_CONSUMER_SECRET
 */
function getWooCommerceConfig() {
  var props = PropertiesService.getScriptProperties();
  var siteUrl = normalizeBaseUrl_(props.getProperty('WOO_BASE_URL'));
  var consumerKey = trimString_(props.getProperty('WOO_CONSUMER_KEY'));
  var consumerSecret = trimString_(props.getProperty('WOO_CONSUMER_SECRET'));

  assertRequiredValue_(siteUrl, 'WOO_BASE_URL');
  assertRequiredValue_(consumerKey, 'WOO_CONSUMER_KEY');
  assertRequiredValue_(consumerSecret, 'WOO_CONSUMER_SECRET');

  return {
    siteUrl: siteUrl,
    consumerKey: consumerKey,
    consumerSecret: consumerSecret
  };
}

/**
 * Confirms WooCommerce configuration without logging secret values.
 */
function checkWooCommerceConfig() {
  var config = getWooCommerceConfig();

  Logger.log('WooCommerce config OK');
  Logger.log('Site URL: ' + config.siteUrl);
  Logger.log('Consumer key exists: ' + !!config.consumerKey);
  Logger.log('Consumer secret exists: ' + !!config.consumerSecret);

  return {
    ok: true,
    siteUrl: config.siteUrl,
    consumerKeyExists: !!config.consumerKey,
    consumerSecretExists: !!config.consumerSecret
  };
}
