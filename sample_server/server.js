'use strict';

const http = require('http');
const Router = require('node-router');
const fs = require('fs');
const crypto = require('crypto');
const merge = require('merge');
const config = require('./config.json');

const router = Router();    // create a new Router instance
const route = router.push;  // shortcut for router.push()

const server = http.createServer(router);

server.listen(config.serverPort);  // launch the server
console.log(`listening on ${config.serverPort}..`);

var authToken = "";

const encrypt = function encrypt(str) {
  return crypto.createHash('md5').update(str).digest('hex');
};

const checksum = function checksum(obj) {
  return encrypt(JSON.stringify(obj));
};

const getLang = function getLang(lang) {
  var content = fs.readFileSync(`${config.translPath}/${lang}.json`);
  var dict = JSON.parse(content) || {};
  console.log(`${lang} translation loaded.`);
  return dict;
};

const updateLang = function updateLang(lang, data) {
  var currContent = getLang(lang);
  var currChecksum = checksum(currContent);
  var clientVersion = data.version;
  delete data.version;

  if (currChecksum != clientVersion) {
    throw new Error("you're trying to update an outdated file!");
  }

  merge.recursive(currContent, data);

  var newChecksum = encrypt(JSON.stringify(currContent));
  if (newChecksum !== currChecksum) {
    var fileName = lang + '.json';
    var prettyContents = JSON.stringify(currContent, null, 2);
    fs.writeFileSync(config.translPath + '/' + fileName, prettyContents);
    console.log(lang + ' translations successfully updted.');
  }
  return newChecksum;
};

const extractCookies = function extractCookies (cookieStr) {
  var result = {};
  if (cookieStr) {
    cookieStr.split(/;\s+/).forEach( (cookie) => {
      var pair = cookie.split('=');
      result[pair[0]] = pair[1];
    });
  }
  return result;
};

const makeAuthToken = function makeAuthToken(base) {
  var salt = Date.now();
  return encrypt(base + salt);
};

/* Common handlers for all requests - start */

// all routes wrapper
route((req, res, next) => {
  // log the request
  console.log(req.method, req.url, 'Params:', JSON.stringify(req.query));
  // set the common headers
  res.setHeader('Content-Type', 'text/json');
  res.setHeader('Access-Control-Allow-Origin', config.allowOrigin);
  // if this is login request - proseed with authentication
  if (req.method === "OPTIONS" || (req.method === "POST" && req.url === "/login")) {
    next();
    return;
  }
  var cookies = extractCookies(req.headers.cookie);
  // auth control for all other requests
  if (!authToken || authToken !== cookies[config.authTokenId]) {
    console.log(cookies);
    console.warn('Unauthorized access attempted.')
    res.writeHead(401);
    res.send('Not logged in.');
  }
  else {
    // continue to next matching route
    next();
  }
});

// all options requests wrapper (needed for the browser's CORS policy)
route('OPTIONS', (req, res, next) => {
  // set the correct CORS headers
  res.setHeader("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type, accept, x-xsrf-token");
  res.setHeader("access-control-max-age", 10);
  res.send('OK');
});

// all post requests wrapper
route('POST', (req, res, next) => {
  var jsonString = "";
  // read the body params
  req.on('data', (data) => { jsonString += data; });
  // store the body params in the request
  req.on('end', () => {
    req.body = JSON.parse(jsonString);
    console.log("Request body:\n", jsonString);
    next();
  });
});
/* Common handlers for all requests - end */

/* API routes */
route('GET', '/ping', (req, res, next) => {
  res.send('OK');
});

route('GET', '/translations/all', (req, res, next) => {
  var translations = {};

  config.languages.forEach((lang) => {
    try {
      translations[lang] = getLang(lang);
      var langChecksum = checksum(translations[lang]);
      translations[lang].checksum = langChecksum;
    }
    catch (e) {
      if (e.code === 'ENOENT') {
        console.warn(e.message);
      } else {
        throw e;
      }
    }
  });

  res.send(JSON.stringify(translations));
});

route('POST', '/translations/updateAll', (req, res, next) => {
  var data = req.body.changes;
  var responseData = {};

  for (var lang in data) {
    var newChecksum = updateLang(lang, data[lang]);
    responseData[lang] = newChecksum;
  }
  res.send(JSON.stringify({checksums: responseData}));
});

route('POST', '/login', function (req, res, next) {
  var data = req.body;
  var userId = data.username;
  var pass = data.password;

  if (encrypt(userId) != config.authUser.id ||
      encrypt(pass) != config.authUser.password) {
    throw new Error("Invalid username and/or password.");
  }
  authToken = makeAuthToken(userId);
  res.setHeader('Set-Cookie', `${config.authTokenId}=${authToken}; HttpOnly;`);
  res.send('OK');
});

route('POST', '/logout', (req, res, next) => {
  authToken = "";
  res.send('OK');
});

// The default error Handler (has to be the last of all route declarations)
route((err, req, res, next) => {
  console.error('Error:', err.message);
  console.warn('stack:', err.stack);
  // just send back the error, that should be enough
  res.send(err);
});