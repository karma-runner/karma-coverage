var istanbul = require('istanbul');

var createCoveragePreprocessor = function(logger, basePath) {
  var log = logger.create('preprocessor.coverage');
  var instrumenter = new istanbul.Instrumenter();

  return function(content, file, done) {
    log.debug('Processing "%s".', file.originalPath);

    var jsPath = file.originalPath.replace(basePath + '/', './');
    instrumenter.instrument(content, jsPath, function(err, instrumentedCode) {
      if(err) {
        log.error('%s\n  at %s', err.message, file.originalPath);
      }
      done(instrumentedCode);
    });
  };
};

createCoveragePreprocessor.$inject = ['logger', 'config.basePath'];

module.exports = createCoveragePreprocessor;
