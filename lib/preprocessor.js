var istanbul  = require('istanbul'),
    ibrik     = require('ibrik'),
    minimatch = require('minimatch');

var createCoveragePreprocessor = function(logger, basePath, reporters, coverageReporter) {
  var log = logger.create('preprocessor.coverage');
  var instrumenterOverrides = (coverageReporter && coverageReporter.instrumenter) || {};
  var instrumenters = {istanbul: istanbul, ibrik: ibrik};

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
      literal = String(instrumenterOverrides[pattern]).toLowerCase();
      if (literal !== 'istanbul' && literal !== 'ibrik') {
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
    var instrumenterLiteral = jsPath.match(/\.coffee$/) ? 'ibrik' : 'istanbul';

    for (var pattern in instrumenterOverrides) {
      if (minimatch(file.originalPath, pattern, {dot: true})) {
        instrumenterLiteral = String(instrumenterOverrides[pattern]).toLowerCase();
      }
    }

    var instrumenter = new instrumenters[instrumenterLiteral].Instrumenter();

    instrumenter.instrument(content, jsPath, function(err, instrumentedCode) {
      if (err) {
        log.error('%s\n  at %s', err.message, file.originalPath);
      }

      if (instrumenterLiteral === 'ibrik') {
        file.path = file.path.replace(/\.coffee$/, '.js');
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
