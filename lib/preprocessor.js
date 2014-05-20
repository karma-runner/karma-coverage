var istanbul = require('istanbul'),
    ibrik    = require('ibrik');


var createCoveragePreprocessor = function(logger, basePath, reporters, config) {

  var log                = logger.create('preprocessor.coverage')
    , coffeeCompilerOff  = (config && config.coverageReporter &&
                            config.coverageReporter.coffeeCompilerOff)
    , jsInstrumenter     = new istanbul.Instrumenter()
    , coffeeInstrumenter = !coffeeCompilerOff
                            ? new ibrik.Instrumenter()
                            : null;

  // if coverage reporter is not used, do not preprocess the files
  if (reporters.indexOf('coverage') === -1) {
    return function(content, _, done) {
      done(content);
    };
  }

  return function(content, file, done) {
    log.debug('Processing "%s".', file.originalPath);

    var jsPath       = file.originalPath.replace(basePath + '/', './')
      , instrumenter = !coffeeCompilerOff && jsPath.match(/\.coffee$/)
                        ? coffeeInstrumenter
                        : jsInstrumenter;

    instrumenter.instrument(content, jsPath, function(err, instrumentedCode) {
      if (err) {
        log.error('%s\n  at %s', err.message, file.originalPath);
      }

      if (!coffeeCompilerOff) {
        file.path = file.path.replace(/\.coffee$/, '.js');
      }

      done(instrumentedCode);
    });
  };
};

createCoveragePreprocessor.$inject = ['logger',
                                      'config.basePath',
                                      'config.reporters',
                                      'config'];

module.exports = createCoveragePreprocessor;
