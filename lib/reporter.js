var path = require('path');
var fs = require('fs');
var util = require('util');
var istanbul = require('istanbul');
var dateformat = require('dateformat');
var globalSourceCache = require('./sourceCache');


var Store = istanbul.Store;

var SourceCacheStore = function(opts) {
  Store.call(this, opts);
  opts = opts || {};
  this.sourceCache = opts.sourceCache;
};
SourceCacheStore.TYPE = 'sourceCacheLookup';
util.inherits(SourceCacheStore, Store);

Store.mix(SourceCacheStore, {
  keys : function() {
    throw 'not implemented';
  },
  get : function(key) {
    return this.sourceCache[key];
  },
  hasKey : function(key) {
    return this.sourceCache.hasOwnProperty(key);
  },
  set : function(key, contents) {
    throw 'not applicable';
  }
});


// TODO(vojta): inject only what required (config.basePath, config.coverageReporter)
var CoverageReporter = function(rootConfig, emitter, helper, logger) {
  var log = logger.create('coverage');
  var config = rootConfig.coverageReporter;
  var basePath = rootConfig.basePath;
  var outDir = config.dir;
  var reporters = config.reporters;
  var sourceCache = globalSourceCache.getByBasePath(basePath);

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
    collectors = {};
    browsers.forEach(function(browser) {
      collectors[browser.id] = new istanbul.Collector();
    });
  };

  this.onBrowserComplete = function(browser, result) {
    var collector = collectors[browser.id];

    if (!collector) {
      return;
    }

    if (result && result.coverage) {
      collector.add(result.coverage);
    }

    pendingFileWritings++;
    helper.mkdirIfNotExists(path.resolve(outDir), function() {
      var now = dateformat(new Date(), 'yyyymmdd_HHMMss');
      var name = 'coverage-' + browser.name + '-' + now + '.json';
      fs.writeFile(path.join(outDir, name), JSON.stringify(collector.getFinalCoverage()), 'utf8', function(err) {
        if (err) {
          log.error(err);
        }
        writeEnd();
      });
    });
  };

  this.onSpecComplete = function(browser, result) {
    if (result.coverage) {
      collectors[browser.id].add(result.coverage);
    }
  };

  this.onRunComplete = function(browsers, results) {
    reporters.forEach(function(reporterConfig) {
      browsers.forEach(function(browser) {
        var collector = collectors[browser.id];
        if (collector) {
          pendingFileWritings++;
          var out = path.resolve(outDir, browser.name);
          helper.mkdirIfNotExists(out, function() {
            var options = helper.merge({}, reporterConfig, {
              dir : out,
              sourceStore : new SourceCacheStore({
                sourceCache: sourceCache
              })
            });
            var reporter = istanbul.Report.create(reporterConfig.type, options);
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

  // TODO(vojta): refactor to onExit
  emitter.on('exit', function(done) {
    if (pendingFileWritings) {
      fileWritingFinished = done;
    } else {
      done();
    }
  });
};

CoverageReporter.$inject = ['config', 'emitter', 'helper', 'logger'];

// PUBLISH
module.exports = CoverageReporter;
