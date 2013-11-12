var istanbul = require('istanbul'),
    ibrik    = require('ibrik');

var createCoveragePreprocessor = function(logger, basePath, reporters) {
  var log = logger.create('preprocessor.coverage');
  var instrumenter = new istanbul.Instrumenter();
  var ibrikwrapper = new ibrik.Instrumenter();

  // if coverage reporter is not used, do not preprocess the files
  if (reporters.indexOf('coverage') === -1) {
    return function(content, _, done) {
      done(content);
    };
  }

  return function(content, file, done) {
    log.debug('Processing "%s".', file.originalPath);

    var jsPath = file.originalPath.replace(basePath + '/', './');
    var which = jsPath.match(/\.coffee$/) ? ibrikwrapper : instrumenter;

    which.instrument(content, jsPath, function(err, instrumentedCode) {
      if(err) {
        log.error('%s\n  at %s', err.message, file.originalPath);
      }

      file.path = file.path.replace(/\.coffee$/, ".js");
      done(instrumentedCode);
    });
  };
};

createCoveragePreprocessor.$inject = ['logger', 'config.basePath', 'config.reporters'];

module.exports = createCoveragePreprocessor;
