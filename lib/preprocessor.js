var istanbul  = require('istanbul'),
    ibrik     = require('ibrik'),
    minimatch = require('minimatch');

var createCoveragePreprocessor = function(logger, basePath, reporters, coverageReporter) {
  var log = logger.create('preprocessor.coverage');
  var instrumenterOverrides = coverageReporter.instrumenter || {};
  var jsInstrumenter = new istanbul.Instrumenter();
  var coffeeInstrumenter = new ibrik.Instrumenter();

  // if coverage reporter is not used, do not preprocess the files
  if (reporters.indexOf('coverage') === -1) {
    return function(content, _, done) {
      done(content);
    };
  }

  return function(content, file, done) {
    log.debug('Processing "%s".', file.originalPath);

    var jsPath = file.originalPath.replace(basePath + '/', './');
    var instrumenter = jsPath.match(/\.coffee$/) ? coffeeInstrumenter : jsInstrumenter;

    for (var pattern in instrumenterOverrides) {
      if (minimatch(file.originalPath, pattern, {dot: true})) {
        switch (String(instrumenterOverrides[pattern]).toLowerCase()) {
          case 'istanbul':
            instrumenter = jsInstrumenter;
            break;
          case 'ibrik':
            instrumenter = coffeeInstrumenter;
            break;
          default:
            log.error('Unknown instrumenter: %s', instrumenterOverrides[pattern]);
        }
      }
    }

    instrumenter.instrument(content, jsPath, function(err, instrumentedCode) {
      if (err) {
        log.error('%s\n  at %s', err.message, file.originalPath);
      }

      if (instrumenter === coffeeInstrumenter) {
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
