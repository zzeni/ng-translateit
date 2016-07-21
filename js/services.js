app.service('config', function () {
  "use strict";

  return {
    langDB: [
      {
        key: 'bg',
        name: 'Български'
      },
      {
        key: 'es',
        name: 'Español'
      },
      {
        key: 'en',
        name: 'English'
      }
    ],
    SERVER_URL: "http://localhost:8080"
  };
});

app.service('Entry', function () {
  "use strict";

  function Entry(path, text) {
    var _original_text = text;
    this.text = text;
    this.path = path;

    this.original_text = function () {
      return _original_text;
    };
  }

  Entry.prototype.changed = function () {
    return this.text !== this.original_text();
  };

  Entry.prototype.revoke = function () {
    this.text = this.original_text();
    this.new_text = this.text;
  };

  return {
    new: function (path, text) {
      return new Entry(path, text)
    }
  }
});

app.service('utils', function (Entry) {
  "use strict";

  var flattenObj = function (object, prefix, target) {
    target = target || [];
    prefix = prefix || '';
    angular.forEach(object, function (value, key) {
      if (angular.isObject(value)) {
        flattenObj(value, prefix + key + '.', target);
      } else {
        target.push(Entry.new(prefix + key, value));
      }
    });
    return target;
  };

  var unflattenObj = function (object) {
    var result = {};
    var current;
    angular.forEach(object, function (value, flatKey) {
      var keys = flatKey.split('.');
      var limit = keys.length - 1;
      current = result;
      angular.forEach(keys, function (key, index) {
        current = current[key] = (index === limit ? value : (current[key] || {}));
      });
    });
    return result;
  };

  return {
    json2dict: flattenObj,
    dict2json: unflattenObj,
    pingBackend: function pingBackend() {
      return $http.get(SERVER_URL + '/ping');
    },
    getAllTranslations: function getAllTranslations() {
      return $http.get(SERVER_URL + '/translations/all');
    },
    submit: function submit(changes) {
      return $http.post(SERVER_URL + '/translations/updateAll', changes);
    }
  };
});

app.service('apiClient', function ($http, config) {
  "use strict";

  return {
    pingBackend: function pingBackend() {
      return $http.get(config.SERVER_URL + '/ping');
    },
    getAllTranslations: function getAllTranslations() {
      return $http.get(config.SERVER_URL + '/translations/all');
    },
    submit: function submit(changes) {
      return $http.post(config.SERVER_URL + '/translations/updateAll', changes);
    }
  };
});

app.factory('TranslationFactory', function (Entry, utils) {
  function versionViolationError(actualVersion, currentVersion) {
    throw new Error("versions don't match!");
  }

  function changesToJson(changes) {
    var result = {};
    for (var key in changes) {
      result[key] = changes[key].new;
    }
    return result;
  }

  function TranslationFactory(translationsData, localStorage) {
    var dict = {};
    var versions = {};
    var changes = {};
    var languages = [];

    var init = function init(data) {
      var dictArray = utils.json2dict(data);
      languages = Object.keys(data);

      dictArray.forEach(function (entry) {
        var pathKey = entry.path.substring(3);
        dict[entry.path] = entry;

        // add empty translation entries for the missing translations
        languages.forEach(function (lang) {
          var newPath = lang + '.' + pathKey;
          if (!dict[newPath]) dict[newPath] = Entry.new(newPath, "");
        });
      });

      // extract the checksums
      languages.forEach(function (lang) {
        var versionKey = lang + '.checksum';
        if (dict[versionKey]) {
          versions[lang] = dict[versionKey].text;
          delete dict[versionKey];
        }
      });
    };

    var initChanges = function initChanges(storedChanges, storedVersions) {
      for (var key in storedChanges) {
        var lang = key.substring(0,2);
        var storedChangesVersion = storedVersions[lang];
        var actualVersion = versions[lang];

        if (!storedChangesVersion) throw new Error("Can't assign changes without version!");

        if (storedChangesVersion !== actualVersion) {
          versionViolationError(storedChangesVersion, actualVersion);
        }

        changes[key] = storedChanges[key];
        applyChange(key, changes[key].new, changes[key].original);
      }
    };

    var applyChange = function applyChange(key, newText, oldText) {
      var entry = dict[key];
      if (!entry) {
        throw new Error('Trying to change non existing entry: ' + key);
      }

      if (oldText !== entry.text) {
        entry.text = newText;
        console.log('Applying a change over a different base for ' + key);
      }
      else {
        entry.text = newText;
        console.log(key + ' entry updated.');
      }
    };

    this.getTranslationKeys = function () {
      return Object.keys(dict);
    };

    this.getDict = function () {
      var translDB = [];

      for (var key in dict) {
        translDB.push(dict[key]);
      }

      return translDB;
    };

    this.getChanges = function () {
      return changes;
    };

    this.getVersions = function () {
      return versions;
    };

    this.hasChanges = function hasChanges() {
      return Object.keys(changes).length;
    };

    this.addChange = function addChange(entry) {
      if (entry.new_text === entry.original_text()) {
        return this.revokeChanges(entry.path);
      } else if (entry.text !== entry.new_text) {
        entry.text = entry.new_text;
        changes[entry.path] = {
          original: entry.original_text(),
          new: entry.text
        };
      }
      entry.editing = false;
    };
    
    this.revokeChange = function revokeChanges(key) {
      delete changes[key];
      dict[key].revoke();
      dict[key].editing = false;
    };

    this.revokeAll = function revokeAll() {
      for (var key in changes) {
        this.revokeChange(key);
      }
    };

    this.changesToJson = function changesToJson() {
      var resultJson = utils.dict2json(changesToJson(changes));
      console.log(resultJson);

      for (var lang in resultJson) {
        resultJson[lang].version = versions[lang];
      }

      return resultJson;
    }

    init(translationsData);
    initChanges(localStorage.changes, localStorage.versions);
  }
  return TranslationFactory;
});
