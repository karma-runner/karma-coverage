var istanbul = require('istanbul');
var globalSourceCache = require('./sourceCache');

var createCoveragePreprocessor = function(logger, basePath, reporters) {
  var log = logger.create('preprocessor.coverage');
  var instrumenter = new istanbul.Instrumenter();
  var sourceCache = globalSourceCache.getByBasePath(basePath);

  // if coverage reporter is not used, do not preprocess the files
  if (reporters.indexOf('coverage') === -1) {
    return function(content, _, done) {
      done(content);
    };
  }

  return function(content, file, done) {
    log.debug('Processing "%s".', file.originalPath);

    var jsPath = file.originalPath.replace(basePath + '/', './');
    instrumenter.instrument(content, jsPath, function(err, instrumentedCode) {
      if(err) {
        log.error('%s\n  at %s', err.message, file.originalPath);
      }

      // remember the actual immediate instrumented JS for given original path
      sourceCache[jsPath] = content;

      done(instrumentedCode);
    });
  };
};

createCoveragePreprocessor.$inject = ['logger', 'config.basePath', 'config.reporters'];

module.exports = createCoveragePreprocessor;
