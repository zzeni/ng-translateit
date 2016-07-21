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

const getLang = function getLang(lang) {
  var content = fs.readFileSync(`${config.translPath}/${lang}.json`);
  var dict = JSON.parse(content) || {};
  dict.checksum = encrypt(JSON.stringify(dict));
  console.log(`${lang} translation loaded.`);
  return dict;
};

const updateLang = function updateLang(lang, data) {
  var currContent = getLang(lang);
  var clientVersion = data.version;
  delete data.version;

  if (currContent.checksum != clientVersion) {
    throw new Error("you're trying to update an outdated file!");
  }

  merge.recursive(currContent, data);

  var newChecksum = encrypt(JSON.stringify(currContent));
  if (newChecksum !== currContent.checksum) {
    var fileName = lang + '.json';
    var prettyContents = JSON.stringify(currContent, null, 2);
    delete currContent.checksum;
    fs.writeFileSync(config.translPath + '/' + fileName, prettyContents);
    console.log(lang + ' translations successfully updted.');
  }
  return newChecksum;
};
//
//const authenticate = function authenticate(req) {
//  if (!authToken || )
//};

/* Common handlers for all requests - start */

// all routes wrapper
route((req, res, next) => {
  // log the request
  console.log(req.method, req.url, 'Params:', JSON.stringify(req.query));
  // set the common headers
  res.setHeader('Content-Type', 'text/json');
  res.setHeader('Access-Control-Allow-Origin', config.allowOrigin);
  // continue to next matching route
  next();
});

// all routes with error wrapper - will catch errors from any route
route((err, req, res, next) => {
  // just send back the error, that should be enough
  res.send(err);
});

// all options requests wrapper (needed for the browser's CORS policy)
route('OPTIONS', (req, res, next) => {
  // set the correct CORS headers
  res.setHeader("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type, accept");
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
  var languages = fs.readdirSync(config.translPath).map((file) => {
    return file.substring(0,2);
  });
  var translations = {};

  languages.forEach((lang) => {
    translations[lang] = getLang(lang);
  });

  res.send(JSON.stringify(translations));
});

route('POST', '/translations/updateAll', (req, res, next) => {
  var data = req.body;
  var responseData = {};

  for (var lang in data) {
    var newChecksum = updateLang(lang, data[lang]);
    responseData[lang] = newChecksum;
  }
  res.send(JSON.stringify({checksums: responseData}));
});

route('POST', '/login', (req, res, next) => {
  var data = req.body;
  var userId = data.username;
  var pass = data.password;
  
  if (encrypt(userId) === config.authUser.id && encrypt(pass) === config.authUser.password) {
    authToken = "xxxx";
  }
});