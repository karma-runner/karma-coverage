var path = require('path');
var fs = require('fs');
var util = require('util');
var istanbul = require('istanbul');
var dateformat = require('dateformat');


var Store = istanbul.Store;

var BasePathStore = function(opts) {
  Store.call(this, opts);
  opts = opts || {};
  this.basePath = opts.basePath;
  this.delegate = Store.create('fslookup');
};
BasePathStore.TYPE = 'basePathlookup';
util.inherits(BasePathStore, Store);

Store.mix(BasePathStore, {
  keys : function() {
    return this.delegate.keys();
  },
  toKey : function(key) {
    if (key.indexOf('./') === 0) { return path.join(this.basePath, key); }
    return key;
  },
  get : function(key) {
    return this.delegate.get(this.toKey(key));
  },
  hasKey : function(key) {
    return this.delegate.hasKey(this.toKey(key));
  },
  set : function(key, contents) {
    return this.delegate.set(this.toKey(key), contents);
  }
});


// TODO(vojta): inject only what required (config.basePath, config.coverageReporter)
var CoverageReporter = function(rootConfig, helper, logger) {
  var log = logger.create('coverage');
  var config = rootConfig.coverageReporter || {};
  var basePath = rootConfig.basePath;
  var outDir = helper.normalizeWinPath(path.resolve(basePath, config.dir || 'coverage'));
  var reporters = config.reporters;

  if (!helper.isDefined(reporters)) {
    reporters = [config];
  }

  this.adapters = [];
  var collectors;
  var pendingFileWritings = 0;
  var fileWritingFinished = function() {};

  function writeEnd() {
    if (!--pendingFileWritings) {
      // cleanup collectors
      Object.keys(collectors).forEach(function(key) {
         collectors[key].dispose();
      });
      fileWritingFinished();
    }
  }

  this.onRunStart = function(browsers) {
    collectors = Object.create(null);

    // TODO(vojta): remove once we don't care about Karma 0.10
    if (browsers) {
      browsers.forEach(function(browser) {
        collectors[browser.id] = new istanbul.Collector();
      });
    }
  };

  this.onBrowserStart = function(browser) {
    collectors[browser.id] = new istanbul.Collector();
  };

  this.onBrowserComplete = function(browser, result) {
    var collector = collectors[browser.id];

    if (!collector) {
      return;
    }

    if (result && result.coverage) {
      collector.add(result.coverage);
    }
  };

  this.onSpecComplete = function(browser, result) {
    if (result.coverage) {
      collectors[browser.id].add(result.coverage);
    }
  };

  this.onRunComplete = function(browsers) {
    reporters.forEach(function(reporterConfig) {
      browsers.forEach(function(browser) {
        var collector = collectors[browser.id];
        if (collector) {
          pendingFileWritings++;
          var reporterOutDir = helper.isDefined(reporterConfig.dir) ? helper.normalizeWinPath(path.resolve(basePath, reporterConfig.dir)) : outDir,
              out = path.resolve(reporterOutDir, browser.name);
          helper.mkdirIfNotExists(out, function() {
            log.debug('Writing coverage to %s', out);
            var options = helper.merge({}, reporterConfig, {
              dir : out,
              sourceStore : new BasePathStore({
                basePath : basePath
              })
            });
            var reporter = istanbul.Report.create(reporterConfig.type || 'html', options);
            try {
              reporter.writeReport(collector, true);
            } catch (e) {
              log.error(e);
            }
            writeEnd();
          });
        }
      });
    });
  };

  this.onExit = function(done) {
    if (pendingFileWritings) {
      fileWritingFinished = done;
    } else {
      done();
    }
  };
};

CoverageReporter.$inject = ['config', 'helper', 'logger'];

// PUBLISH
module.exports = CoverageReporter;
