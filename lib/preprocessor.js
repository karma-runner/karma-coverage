var istanbul = require('istanbul'),
    ibrik    = require('ibrik');
	
function BaselineCollector(instrumenter) {
    this.instrumenter = instrumenter;
    this.collector = new istanbul.Collector();
    this.instrument = instrumenter.instrument.bind(this.instrumenter);

    var origInstrumentSync = instrumenter.instrumentSync;
    this.instrumentSync = function () {
        var args = Array.prototype.slice.call(arguments),
            ret = origInstrumentSync.apply(this.instrumenter, args),
            baseline = this.instrumenter.lastFileCoverage(),
            coverage = {};
        coverage[baseline.path] = baseline;
        this.collector.add(coverage);
        return ret;
    };
    //monkey patch the instrumenter to call our version instead
    instrumenter.instrumentSync = this.instrumentSync.bind(this);
}

BaselineCollector.prototype = {
    getCoverage: function () {
        return this.collector.getFinalCoverage();
    }
};
	
jsInstrumenter = new BaselineCollector(new istanbul.Instrumenter());

var createCoveragePreprocessor = function(logger, basePath, reporters) {
  var log = logger.create('preprocessor.coverage');
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

    instrumenter.instrument(content, jsPath, function(err, instrumentedCode) {
      if(err) {
        log.error('%s\n  at %s', err.message, file.originalPath);
      }

      file.path = file.path.replace(/\.coffee$/, '.js');
      done(instrumentedCode);
    });
  };
};

createCoveragePreprocessor.$inject = ['logger', 'config.basePath', 'config.reporters'];

module.exports = createCoveragePreprocessor;
