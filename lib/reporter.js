// Coverage Reporter
// =====================
//
// Generates the report

// Dependencies
// ------------

var path = require('path')
var istanbul = require('istanbul')

var globalSourceCache = require('./source-cache')
var coverageMap = require('./coverage-map')
var SourceCacheStore = require('./source-cache-store')

// TODO(vojta): inject only what required (config.basePath, config.coverageReporter)
var CoverageReporter = function (rootConfig, helper, logger) {
  var _ = helper._
  var log = logger.create('coverage')

  // Instance variables
  // ------------------

  this.adapters = []

  // Options
  // -------

  var config = rootConfig.coverageReporter || {}
  var basePath = rootConfig.basePath
  var reporters = config.reporters
  var sourceCache = globalSourceCache.get(basePath)
  var includeAllSources = config.includeAllSources === true

  if (config.watermarks) {
    config.watermarks = helper.merge({}, istanbul.config.defaultConfig().reporting.watermarks, config.watermarks)
  }

  if (!helper.isDefined(reporters)) {
    reporters = [config]
  }

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
      _.forEach(collectors, function (collector) {
        collector.dispose()
      })

      fileWritingFinished()
    }
  }

  // Generate the output directory from the `coverageReporter.dir` and
  // `coverageReporter.subdir` options.
  function generateOutputDir (browserName, dir, subdir) {
    dir = dir || 'coverage'
    subdir = subdir || browserName

    if (_.isFunction(subdir)) {
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

    if (!includeAllSources) return

    collectors[browser.id].add(coverageMap.get())
  }

  this.onBrowserComplete = function (browser, result) {
    var collector = collectors[browser.id]

    if (!collector) return
    if (!result || !result.coverage) return

    collector.add(result.coverage)
  }

  this.onSpecComplete = function (browser, result) {
    if (!result.coverage) return

    collectors[browser.id].add(result.coverage)
  }

  this.onRunComplete = function (browsers) {
    reporters.forEach(function (reporterConfig) {
      browsers.forEach(function (browser) {
        var collector = collectors[browser.id]

        if (!collector) {
          return
        }

        pendingFileWritings++

        var mainDir = reporterConfig.dir || config.dir
        var subDir = reporterConfig.subdir || config.subdir
        var simpleOutputDir = generateOutputDir(browser.name, mainDir, subDir)
        var resolvedOutputDir = path.resolve(basePath, simpleOutputDir)

        var outputDir = helper.normalizeWinPath(resolvedOutputDir)
        var sourceStore = _.isEmpty(sourceCache) ? null : new SourceCacheStore({
          sourceCache: sourceCache
        })
        var options = helper.merge({
          sourceStore: sourceStore
        }, config, reporterConfig, {
          dir: outputDir
        })
        var reporter = istanbul.Report.create(reporterConfig.type || 'html', options)

        // If reporting to console, skip directory creation
        var isConsole = reporterConfig.type && reporterConfig.type.match(/^(text|text-summary)$/)
        var hasNoFile = _.isUndefined(reporterConfig.file)

        if (isConsole && hasNoFile) {
          writeReport(reporter, collector)
          return
        }

        helper.mkdirIfNotExists(outputDir, function () {
          log.debug('Writing coverage to %s', outputDir)
          writeReport(reporter, collector)
          disposeCollectors()
        })
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
