// Coverage Reporter
// Part of this code is based on [1], which is licensed under the New BSD License.
// For more information see the See the accompanying LICENSE-istanbul file for terms.
//
// [1]: https://github.com/gotwarlost/istanbul/blob/master/lib/command/check-coverage.js
// =====================
//
// Generates the report

// Dependencies
// ------------

var path = require('path')
var istanbulLibCoverage = require('istanbul-lib-coverage')
var istanbulLibReport = require('istanbul-lib-report')
var minimatch = require('minimatch')
var _ = require('lodash')

var globalSourceMapStore = require('./source-map-store')
var globalCoverageMap = require('./coverage-map')
var reports = require('./report-creator')

function isAbsolute (file) {
  if (path.isAbsolute) {
    return path.isAbsolute(file)
  }

  return path.resolve(file) === path.normalize(file)
}

// TODO(vojta): inject only what required (config.basePath, config.coverageReporter)
var CoverageReporter = function (rootConfig, helper, logger, emitter) {
  var log = logger.create('coverage')

  // Instance variables
  // ------------------

  this.adapters = []

  // Options
  // -------

  var config = rootConfig.coverageReporter || {}
  var basePath = rootConfig.basePath
  var reporters = config.reporters
  var sourceMapStore = globalSourceMapStore.get(basePath)
  var includeAllSources = config.includeAllSources === true

  if (config.watermarks) {
    config.watermarks = helper.merge({}, istanbulLibReport.getDefaultWatermarks(), config.watermarks)
  }

  if (!helper.isDefined(reporters)) {
    reporters = [config]
  }

  var coverageMaps

  function normalize (key) {
    // Exclude keys will always be relative, but covObj keys can be absolute or relative
    var excludeKey = isAbsolute(key) ? path.relative(basePath, key) : key
    // Also normalize for files that start with `./`, etc.
    excludeKey = path.normalize(excludeKey)

    return excludeKey
  }

  function getTrackedFiles (coverageMap, patterns) {
    var files = []

    coverageMap.files().forEach(function (key) {
      // Do any patterns match the resolved key
      var found = patterns.some(function (pattern) {
        return minimatch(normalize(key), pattern, { dot: true })
      })

      // if no patterns match, keep the key
      if (!found) {
        files.push(key)
      }
    })

    return files
  }

  function overrideThresholds (key, overrides) {
    var thresholds = {}

    // First match wins
    Object.keys(overrides).some(function (pattern) {
      if (minimatch(normalize(key), pattern, { dot: true })) {
        thresholds = overrides[pattern]
        return true
      }
    })

    return thresholds
  }

  function checkCoverage (browser, coverageMap) {
    var defaultThresholds = {
      global: {
        statements: 0,
        branches: 0,
        lines: 0,
        functions: 0,
        excludes: []
      },
      each: {
        statements: 0,
        branches: 0,
        lines: 0,
        functions: 0,
        excludes: [],
        overrides: {}
      }
    }

    var thresholds = helper.merge({}, defaultThresholds, config.check)

    var globalTrackedFiles = getTrackedFiles(coverageMap, thresholds.global.excludes)
    var eachTrackedFiles = getTrackedFiles(coverageMap, thresholds.each.excludes)
    var globalResults = istanbulLibCoverage.createCoverageSummary()
    var eachResults = {}
    globalTrackedFiles.forEach(function (f) {
      var fileCoverage = coverageMap.fileCoverageFor(f)
      var summary = fileCoverage.toSummary()
      globalResults.merge(summary)
    })
    eachTrackedFiles.forEach(function (f) {
      var fileCoverage = coverageMap.fileCoverageFor(f)
      var summary = fileCoverage.toSummary()
      eachResults[f] = summary
    })

    var coverageFailed = false

    function check (name, thresholds, actuals) {
      var keys = [
        'statements',
        'branches',
        'lines',
        'functions'
      ]

      keys.forEach(function (key) {
        var actual = actuals[key].pct
        var actualUncovered = actuals[key].total - actuals[key].covered
        var threshold = thresholds[key]

        if (threshold < 0) {
          if (threshold * -1 < actualUncovered) {
            coverageFailed = true
            log.error(browser.name + ': Uncovered count for ' + key + ' (' + actualUncovered +
              ') exceeds ' + name + ' threshold (' + -1 * threshold + ')')
          }
        } else {
          if (actual < threshold) {
            coverageFailed = true
            log.error(browser.name + ': Coverage for ' + key + ' (' + actual +
              '%) does not meet ' + name + ' threshold (' + threshold + '%)')
          }
        }
      })
    }

    check('global', thresholds.global, globalResults.toJSON())

    eachTrackedFiles.forEach(function (key) {
      var keyThreshold = helper.merge(thresholds.each, overrideThresholds(key, thresholds.each.overrides))
      check('per-file' + ' (' + key + ') ', keyThreshold, eachResults[key].toJSON())
    })

    return coverageFailed
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
    coverageMaps = Object.create(null)

    // TODO(vojta): remove once we don't care about Karma 0.10
    if (browsers) {
      browsers.forEach(this.onBrowserStart.bind(this))
    }
  }

  this.onBrowserStart = function (browser) {
    var startingMap = {}
    if (includeAllSources) {
      startingMap = globalCoverageMap.get()
    }

    coverageMaps[browser.id] = istanbulLibCoverage.createCoverageMap(startingMap)
  }

  this.onBrowserComplete = function (browser, result) {
    var coverageMap = coverageMaps[browser.id]

    if (!coverageMap) return
    if (!result || !result.coverage) return

    coverageMap.merge(result.coverage)
  }

  this.onSpecComplete = function (browser, result) {
    var coverageMap = coverageMaps[browser.id]

    if (!coverageMap) return
    if (!result.coverage) return

    coverageMap.merge(result.coverage)
  }

  this.onRunComplete = function (browsers, results) {
    var checkedCoverage = {}

    reporters.forEach(function (reporterConfig) {
      browsers.forEach(function (browser) {
        var coverageMap = coverageMaps[browser.id]

        if (!coverageMap) {
          return
        }

        var mainDir = reporterConfig.dir || config.dir
        var subDir = reporterConfig.subdir || config.subdir
        var browserName = browser.name.replace(':', '')
        var simpleOutputDir = generateOutputDir(browserName, mainDir, subDir)
        var resolvedOutputDir = path.resolve(basePath, simpleOutputDir)

        var outputDir = helper.normalizeWinPath(resolvedOutputDir)
        var options = helper.merge(config, reporterConfig, {
          dir: outputDir,
          subdir: '',
          browser: browser,
          emitter: emitter
        })
        var remappedCoverageMap = sourceMapStore.transformCoverage(coverageMap).map

        // If config.check is defined, check coverage levels for each browser
        if (config.hasOwnProperty('check') && !checkedCoverage[browser.id]) {
          checkedCoverage[browser.id] = true
          var coverageFailed = checkCoverage(browser, remappedCoverageMap)
          if (coverageFailed) {
            if (results) {
              results.exitCode = 1
            }
          }
        }

        var context = istanbulLibReport.createContext(options)
        var tree = istanbulLibReport.summarizers.pkg(remappedCoverageMap)
        var report = reports.create(reporterConfig.type || 'html', options)

        // // If reporting to console or in-memory skip directory creation
        var toDisk = !reporterConfig.type || !reporterConfig.type.match(/^(text|text-summary|in-memory)$/)
        var hasNoFile = _.isUndefined(reporterConfig.file)

        if (!toDisk && hasNoFile) {
          tree.visit(report, context)
          return
        }

        helper.mkdirIfNotExists(outputDir, function () {
          log.debug('Writing coverage to %s', outputDir)
          tree.visit(report, context)
        })
      })
    })
  }

  this.onExit = function (done) {
    if (typeof config._onExit === 'function') {
      config._onExit(done)
    } else {
      done()
    }
  }
}

CoverageReporter.$inject = ['config', 'helper', 'logger', 'emitter']

// PUBLISH
module.exports = CoverageReporter
