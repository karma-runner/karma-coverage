// Coverage Preprocessor
// =====================
//
// Depends on the the reporter to generate an actual report

// Dependencies
// ------------

var istanbul = require('istanbul')
var minimatch = require('minimatch')
var globalSourceCache = require('./sourceCache')
var extend = require('util')._extend
var coverageMap = require('./coverageMap')

// Regexes
// -------

var coverageObjRegex = /\{.*"path".*"fnMap".*"statementMap".*"branchMap".*\}/g

// Preprocessor creator function
function createCoveragePreprocessor (logger, helper, basePath, reporters, coverageReporter) {
  var _ = helper._
  var log = logger.create('preprocessor.coverage')

  // Options
  // -------

  var instrumenterOverrides = {}
  var instrumenters = {istanbul: istanbul}
  var includeAllSources = false

  if (coverageReporter) {
    instrumenterOverrides = coverageReporter.instrumenter
    instrumenters = extend({istanbul: istanbul}, coverageReporter.instrumenters)
    includeAllSources = coverageReporter.includeAllSources === true
  }

  var sourceCache = globalSourceCache.getByBasePath(basePath)

  var instrumentersOptions = _.reduce(instrumenters, function getInstumenterOptions (memo, instrument, name) {
      memo[name] = {}

      if (coverageReporter && coverageReporter.instrumenterOptions) {
        memo[name] = coverageReporter.instrumenterOptions[name]
      }

      return memo
    }, {})

  // if coverage reporter is not used, do not preprocess the files
  if (!_.includes(reporters, 'coverage')) {
    return function (content, _, done) {
      done(content)
    }
  }

  // check instrumenter override requests
  function checkInstrumenters () {
    return _.reduce(instrumenterOverrides, function (acc, literal, pattern) {
      if (!_.contains(_.keys(instrumenters), String(literal))) {
        log.error('Unknown instrumenter: %s', literal)
        return false
      }
      return acc
    }, true)
  }

  if (!checkInstrumenters()) {
    return function (content, _, done) {
      return done(1)
    }
  }

  return function (content, file, done) {
    log.debug('Processing "%s".', file.originalPath)

    var jsPath = file.originalPath.replace(basePath + '/', './')
    // default instrumenters
    var instrumenterLiteral = 'istanbul'

    _.forEach(instrumenterOverrides, function (literal, pattern) {
      if (minimatch(file.originalPath, pattern, {dot: true})) {
        instrumenterLiteral = String(literal)
      }
    })

    var InstrumenterConstructor = instrumenters[instrumenterLiteral].Instrumenter
    var constructOptions = instrumentersOptions[instrumenterLiteral]
    var instrumenter = new InstrumenterConstructor(constructOptions || {})

    instrumenter.instrument(content, jsPath, function (err, instrumentedCode) {
      if (err) {
        log.error('%s\n  at %s', err.message, file.originalPath)
      }

      // remember the actual immediate instrumented JS for given original path
      sourceCache[jsPath] = content

      if (includeAllSources) {
        var coverageObjMatch = coverageObjRegex.exec(instrumentedCode)

        if (coverageObjMatch !== null) {
          var coverageObj = JSON.parse(coverageObjMatch[0])

          coverageMap.add(coverageObj)
        }
      }

      done(instrumentedCode)
    })
  }
}

createCoveragePreprocessor.$inject = [
  'logger',
  'helper',
  'config.basePath',
  'config.reporters',
  'config.coverageReporter'
]

module.exports = createCoveragePreprocessor
