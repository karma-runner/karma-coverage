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
var CoverageReporter = function(rootConfig, helper, logger) {
  var log = logger.create('coverage');
  var config = rootConfig.coverageReporter || {};
  var basePath = rootConfig.basePath;
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

  /**
   * Generate the output directory from the `coverageReporter.dir` and
   * `coverageReporter.subdir` options.
   *
   * @param {String} browserName - The browser name
   * @param {String} dir - The given option
   * @param {String|Function} subdir - The given option
   *
   * @return {String} - The output directory
   */
  function generateOutputDir(browserName, dir, subdir) {
    dir = dir || 'coverage';
    subdir = subdir || browserName;

    if (typeof subdir === 'function') {
      subdir = subdir(browserName);
    }

    return path.join(dir, subdir);
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

          var outputDir = helper.normalizeWinPath(path.resolve(basePath, generateOutputDir(browser.name,
                                                                                           reporterConfig.dir || config.dir,
                                                                                           reporterConfig.subdir || config.subdir)));

          helper.mkdirIfNotExists(outputDir, function() {
            log.debug('Writing coverage to %s', outputDir);
            var options = helper.merge({}, reporterConfig, {
              dir : outputDir,
              sourceStore : new SourceCacheStore({
                sourceCache: sourceCache
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
