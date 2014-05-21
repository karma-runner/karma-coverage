var istanbul = require('istanbul'),
    ibrik    = require('ibrik');

var createCoveragePreprocessor = function(logger, basePath, reporters, config) {
  var log = logger.create('preprocessor.coverage');
  var compileCoffee = config.compileCoffee || typeof config.compileCoffee == 'undefined';
  var jsInstrumenter = new istanbul.Instrumenter();
  var coffeeInstrumenter = compileCoffee ? new ibrik.Instrumenter() : null;

  // if coverage reporter is not used, do not preprocess the files
  if (reporters.indexOf('coverage') === -1) {
    return function(content, _, done) {
      done(content);
    };
  }

  return function(content, file, done) {
    log.debug('Processing "%s".', file.originalPath);

    var jsPath = file.originalPath.replace(basePath + '/', './');
    var instrumenter = (compileCoffee && jsPath.match(/\.coffee$/)) ?
                          coffeeInstrumenter :
                          jsInstrumenter;

    instrumenter.instrument(content, jsPath, function(err, instrumentedCode) {
      if (err) {
        log.error('%s\n  at %s', err.message, file.originalPath);
      }

      if (compileCoffee) {
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
