// Coverage Preprocessor
// =====================
//
// Depends on the the reporter to generate an actual report

// Dependencies
// ------------

var { createInstrumenter } = require('istanbul-lib-instrument')
var minimatch = require('minimatch')
var path = require('path')
var _ = require('lodash')
var SourceMapConsumer = require('source-map').SourceMapConsumer
var SourceMapGenerator = require('source-map').SourceMapGenerator
var globalSourceMapStore = require('./source-map-store')
var globalCoverageMap = require('./coverage-map')

// Regexes
// -------

var coverageObjRegex = /\{.*"path".*"fnMap".*"statementMap".*"branchMap".*\}/g

// Preprocessor creator function
function createCoveragePreprocessor (logger, helper, basePath, reporters, coverageReporter) {
  var log = logger.create('preprocessor.coverage')

  // Options
  // -------

  function isConstructor (Func) {
    try {
      // eslint-disable-next-line
      new Func()
    } catch (err) {
      // error message should be of the form: "TypeError: func is not a constructor"
      // test for this type of message to ensure we failed due to the function not being
      // constructable
      if (/TypeError.*constructor/.test(err.message)) {
        return false
      }
    }
    return true
  }

  function getCreatorFunction (Obj) {
    if (Obj.Instrumenter) {
      return function (opts) {
        return new Obj.Instrumenter(opts)
      }
    }
    if (!_.isFunction(Obj)) {
      // Object doesn't have old instrumenter variable and isn't a
      // constructor, so we can't use it to create an instrumenter
      return null
    }
    if (isConstructor(Obj)) {
      return function (opts) {
        return new Obj(opts)
      }
    }
    return Obj
  }

  var instrumenterOverrides = {}
  var instrumenters = { istanbul: createInstrumenter }
  var includeAllSources = false
  var useJSExtensionForCoffeeScript = false

  if (coverageReporter) {
    instrumenterOverrides = coverageReporter.instrumenter
    _.forEach(coverageReporter.instrumenters, function (instrumenter, literal) {
      var creatorFunction = getCreatorFunction(instrumenter)
      if (creatorFunction) {
        instrumenters[literal] = creatorFunction
      }
    })
    includeAllSources = coverageReporter.includeAllSources === true
    useJSExtensionForCoffeeScript = coverageReporter.useJSExtensionForCoffeeScript === true
  }

  var sourceMapStore = globalSourceMapStore.get(basePath)

  var instrumentersOptions = _.reduce(instrumenters, function getInstrumenterOptions (memo, instrument, name) {
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
      if (!_.includes(_.keys(instrumenters), String(literal))) {
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

    var jsPath = path.resolve(file.originalPath)
    // default instrumenters
    var instrumenterLiteral = 'istanbul'

    _.forEach(instrumenterOverrides, function (literal, pattern) {
      if (minimatch(file.originalPath, pattern, { dot: true })) {
        instrumenterLiteral = String(literal)
      }
    })

    var instrumenterCreator = instrumenters[instrumenterLiteral]
    var constructOptions = instrumentersOptions[instrumenterLiteral] || {}
    var options = Object.assign({}, constructOptions)
    var codeGenerationOptions = null
    options.autoWrap = options.autoWrap || !options.noAutoWrap

    if (file.sourceMap) {
      log.debug('Enabling source map generation for "%s".', file.originalPath)
      codeGenerationOptions = Object.assign({}, {
        format: {
          compact: !constructOptions.noCompact
        },
        sourceMap: file.sourceMap.file,
        sourceMapWithCode: true,
        file: file.path
      }, constructOptions.codeGenerationOptions || {})
      options.produceSourceMap = true
    }

    options = Object.assign({}, options, { codeGenerationOptions: codeGenerationOptions })

    var instrumenter = instrumenterCreator(options)
    instrumenter.instrument(content, jsPath, function (err, instrumentedCode) {
      if (err) {
        log.error('%s\n  at %s', err.message, file.originalPath)
        done(err.message)
      } else {
        if (file.sourceMap && instrumenter.lastSourceMap()) {
          log.debug('Adding source map to instrumented file for "%s".', file.originalPath)
          var generator = SourceMapGenerator.fromSourceMap(new SourceMapConsumer(instrumenter.lastSourceMap().toString()))
          generator.applySourceMap(new SourceMapConsumer(file.sourceMap))
          file.sourceMap = JSON.parse(generator.toString())
          instrumentedCode += '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,'
          instrumentedCode += Buffer.from(JSON.stringify(file.sourceMap)).toString('base64') + '\n'
        }

        // Register the sourceMap for transformation during reporting
        sourceMapStore.registerMap(jsPath, file.sourceMap)

        if (includeAllSources) {
          var coverageObj
          // Check if the file coverage object is exposed from the instrumenter directly
          if (instrumenter.lastFileCoverage) {
            coverageObj = instrumenter.lastFileCoverage()
            globalCoverageMap.add(coverageObj)
          } else {
            // Attempt to match and parse coverage object from instrumented code

            // reset stateful regex
            coverageObjRegex.lastIndex = 0
            var coverageObjMatch = coverageObjRegex.exec(instrumentedCode)
            if (coverageObjMatch !== null) {
              coverageObj = JSON.parse(coverageObjMatch[0])
              globalCoverageMap.add(coverageObj)
            }
          }
        }

        // RequireJS expects JavaScript files to end with `.js`
        if (useJSExtensionForCoffeeScript && instrumenterLiteral === 'ibrik') {
          file.path = file.path.replace(/\.coffee$/, '.js')
        }

        done(instrumentedCode)
      }
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
