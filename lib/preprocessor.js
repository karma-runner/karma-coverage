var istanbul  = require('istanbul'),
    minimatch = require('minimatch'),
    globalSourceCache = require('./sourceCache'),
    extend = require('util')._extend,
    coverageMap = require('./coverageMap');

var createCoveragePreprocessor = function(logger, basePath, reporters, coverageReporter) {
  var log = logger.create('preprocessor.coverage');
  var instrumenterOverrides = (coverageReporter && coverageReporter.instrumenter) || {};
  var instrumenters = extend({istanbul: istanbul}, (coverageReporter && coverageReporter.instrumenters));
  var sourceCache = globalSourceCache.getByBasePath(basePath);
  var includeAllSources = coverageReporter && coverageReporter.includeAllSources === true;
  var instrumentersOptions = Object.keys(instrumenters).reduce(function getInstumenterOptions(memo, instrumenterName){
    memo[instrumenterName] = (coverageReporter && coverageReporter.instrumenterOptions && coverageReporter.instrumenterOptions[instrumenterName]) || {};
    return memo;
  }, {});

  // if coverage reporter is not used, do not preprocess the files
  if (reporters.indexOf('coverage') === -1) {
    return function(content, _, done) {
      done(content);
    };
  }

  // check instrumenter override requests
  function checkInstrumenters() {
    var literal;
    for (var pattern in instrumenterOverrides) {
      literal = String(instrumenterOverrides[pattern]);
      if (Object.keys(instrumenters).indexOf(literal) < 0) {
        log.error('Unknown instrumenter: %s', literal);
        return false;
      }
    }
    return true;
  }
  if (!checkInstrumenters()) {
    return function(content, _, done) {
      return done(1);
    };
  }

  return function(content, file, done) {
    log.debug('Processing "%s".', file.originalPath);

    var jsPath = file.originalPath.replace(basePath + '/', './');
    // default instrumenters
    var instrumenterLiteral = 'istanbul';

    for (var pattern in instrumenterOverrides) {
      if (minimatch(file.originalPath, pattern, {dot: true})) {
        instrumenterLiteral = String(instrumenterOverrides[pattern]);
      }
    }

    var instrumenter = new instrumenters[instrumenterLiteral].Instrumenter(instrumentersOptions[instrumenterLiteral] || {});

    instrumenter.instrument(content, jsPath, function(err, instrumentedCode) {

      if (err) {
        log.error('%s\n  at %s', err.message, file.originalPath);
      }

      // remember the actual immediate instrumented JS for given original path
      sourceCache[jsPath] = content;

      if (includeAllSources) {
        var coverageObjRegex = /\{.*"path".*"fnMap".*"statementMap".*"branchMap".*\}/g;
        var coverageObjMatch = coverageObjRegex.exec(instrumentedCode);

        if (coverageObjMatch !== null) {
			var coverageObj = JSON.parse(coverageObjMatch[0]);
			
			coverageMap.add(coverageObj);
        }
      }

      done(instrumentedCode);
    });
  };
};

createCoveragePreprocessor.$inject = ['logger',
                                      'config.basePath',
                                      'config.reporters',
                                      'config.coverageReporter'];

module.exports = createCoveragePreprocessor;
