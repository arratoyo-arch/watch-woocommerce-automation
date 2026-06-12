function trimString_(value) {
  return String(value || '').trim();
}

function normalizeBaseUrl_(value) {
  var trimmed = trimString_(value);
  return trimmed.replace(/\/+$/, '');
}

function trimSlashes_(value) {
  return String(value || '').replace(/^\/+|\/+$/g, '');
}

function buildUrl_(baseUrl, params) {
  var query = Object.keys(params || {})
    .filter(function(key) {
      return params[key] !== undefined && params[key] !== null && params[key] !== '';
    })
    .map(function(key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
    })
    .join('&');

  return query ? baseUrl + '?' + query : baseUrl;
}

function parseWooCommerceResponse_(response) {
  var statusCode = response.getResponseCode();
  var body = response.getContentText();
  var parsed = {};

  if (body) {
    try {
      parsed = JSON.parse(body);
    } catch (error) {
      throw new Error('WooCommerce API returned invalid JSON: ' + body);
    }
  }

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error('WooCommerce API request failed: HTTP ' + statusCode + ' ' + body);
  }

  return parsed;
}

function logInfo_(message) {
  console.log('[WooCommerce] ' + message);
}

function assertRequiredValue_(value, name) {
  if (value === undefined || value === null || value === '') {
    throw new Error(name + ' is required.');
  }
}

function getRequiredColumnIndexes_(headers, requiredHeaders) {
  var indexes = {};
  var missing = [];

  requiredHeaders.forEach(function(headerName) {
    var index = headers.indexOf(headerName);
    if (index === -1) {
      missing.push(headerName);
    } else {
      indexes[headerName] = index;
    }
  });

  if (missing.length > 0) {
    throw new Error('Missing required sheet columns: ' + missing.join(', '));
  }

  return indexes;
}
