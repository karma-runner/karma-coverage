var path = require('path')
var util = require('util')
var istanbul = require('istanbul')
var globalSourceCache = require('./sourceCache')
var coverageMap = require('./coverageMap')

var Store = istanbul.Store

var SourceCacheStore = function (opts) {
  Store.call(this, opts)
  opts = opts || {}
  this.sourceCache = opts.sourceCache
}
SourceCacheStore.TYPE = 'sourceCacheLookup'
util.inherits(SourceCacheStore, Store)

Store.mix(SourceCacheStore, {
  keys: function () {
    throw new Error('Not implemented')
  },
  get: function (key) {
    return this.sourceCache[key]
  },
  hasKey: function (key) {
    return this.sourceCache.hasOwnProperty(key)
  },
  set: function (key, contents) {
    throw new Error('Not applicable')
  }
})

// TODO(vojta): inject only what required (config.basePath, config.coverageReporter)
var CoverageReporter = function (rootConfig, helper, logger) {
  var _ = helper._
  var log = logger.create('coverage')
  var config = rootConfig.coverageReporter || {}
  var basePath = rootConfig.basePath
  var reporters = config.reporters
  var sourceCache = globalSourceCache.getByBasePath(basePath)
  var includeAllSources = config.includeAllSources === true

  if (config.watermarks) {
    config.watermarks = helper.merge({}, istanbul.config.defaultConfig().reporting.watermarks, config.watermarks)
  }

  if (!helper.isDefined(reporters)) {
    reporters = [config]
  }

  this.adapters = []
  var collectors
  var pendingFileWritings = 0
  var fileWritingFinished = function () {}

  function writeReport (reporter, collector) {
    try {
      reporter.writeReport(collector, true)
    } catch (e) {
      log.error(e)
    }

    --pendingFileWritings
  }

  function disposeCollectors () {
    if (pendingFileWritings <= 0) {
      Object.keys(collectors).forEach(function (key) {
        collectors[key].dispose()
      })
      fileWritingFinished()
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
  function generateOutputDir (browserName, dir, subdir) {
    dir = dir || 'coverage'
    subdir = subdir || browserName

    if (typeof subdir === 'function') {
      subdir = subdir(browserName)
    }

    return path.join(dir, subdir)
  }

  this.onRunStart = function (browsers) {
    collectors = Object.create(null)

    // TODO(vojta): remove once we don't care about Karma 0.10
    if (browsers) {
      browsers.forEach(this.onBrowserStart.bind(this))
    }
  }

  this.onBrowserStart = function (browser) {
    collectors[browser.id] = new istanbul.Collector()
    if (includeAllSources) {
      collectors[browser.id].add(coverageMap.get())
    }
  }

  this.onBrowserComplete = function (browser, result) {
    var collector = collectors[browser.id]

    if (!collector) {
      return
    }

    if (result && result.coverage) {
      collector.add(result.coverage)
    }
  }

  this.onSpecComplete = function (browser, result) {
    if (result.coverage) {
      collectors[browser.id].add(result.coverage)
    }
  }

  this.onRunComplete = function (browsers) {
    reporters.forEach(function (reporterConfig) {
      browsers.forEach(function (browser) {
        var collector = collectors[browser.id]
        if (collector) {
          pendingFileWritings++

          var mainDir = reporterConfig.dir || config.dir
          var subDir = reporterConfig.subdir || config.subdir
          var simpleOutputDir = generateOutputDir(browser.name, mainDir, subDir)
          var resolvedOutputDir = path.resolve(basePath, simpleOutputDir)

          var outputDir = helper.normalizeWinPath(resolvedOutputDir)
          var options = helper.merge({
            sourceStore: _.isEmpty(sourceCache) ? null : new SourceCacheStore({
              sourceCache: sourceCache
            })
          }, config, reporterConfig, {
            dir: outputDir
          })
          var reporter = istanbul.Report.create(reporterConfig.type || 'html', options)

          // If reporting to console, skip directory creation
          if (reporterConfig.type && reporterConfig.type.match(/^(text|text-summary)$/) && typeof reporterConfig.file === 'undefined') {
            writeReport(reporter, collector)
            return
          }

          helper.mkdirIfNotExists(outputDir, function () {
            log.debug('Writing coverage to %s', outputDir)
            writeReport(reporter, collector)
            disposeCollectors()
          })
        }

      })
    })

    disposeCollectors()
  }

  this.onExit = function (done) {
    if (pendingFileWritings) {
      fileWritingFinished = done
    } else {
      done()
    }
  }
}

CoverageReporter.$inject = ['config', 'helper', 'logger']

// PUBLISH
module.exports = CoverageReporter
