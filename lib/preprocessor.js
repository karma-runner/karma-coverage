// Coverage Preprocessor
// =====================
//
// Depends on the the reporter to generate an actual report

// Dependencies
// ------------

var istanbulApi = require('istanbul-api');
var _ = require("lodash");
var path = require('path');
var SourceMapConsumer = require('source-map').SourceMapConsumer;
var SourceMapGenerator = require('source-map').SourceMapGenerator;

function Preprocessor(log, helper, configuration, sharedSourceMapStore) {
    this.log = log;
    this.helper = helper;
    this.configuration = configuration;
    this.sharedSourceMapStore = sharedSourceMapStore;
}

Preprocessor.prototype.applyTo = function (content, file, done) {
    this._extractSourceMap(content, file);

    if (this.configuration.instrument !== false) {
        this._instrument(content, file, done);
    } else {
        done(content);
    }
};

Preprocessor.prototype._extractSourceMap = function (content, file) {
    this.log.debug('Extract source map for coverage from "%s".', file.originalPath);

    if (file.sourceMap && file.sourceMap.sources.length > 0) {
        this.log.debug('Register source map for "%s".', file.originalPath);
        this.sharedSourceMapStore.registerMap(file.originalPath, file.sourceMap);
    }
};

Preprocessor.prototype._getInstrumentationOptions = function (file) {
    var instrumentationOptions = this.configuration.getInstrumenterOpts();
    var that = this;
    instrumentationOptions.sourceMapUrlCallback = function (fileName, sourceMapUrl) {
        that.sharedSourceMapStore.registerURL(fileName, sourceMapUrl);
    };
    instrumentationOptions.produceSourceMap = instrumentationOptions.produceSourceMap || !!file.sourceMap;
    return instrumentationOptions;
};

Preprocessor.prototype._instrument = function (content, file, done) {
    this.log.debug('instrument file "%s".', file.originalPath);
    var jsPath = path.resolve(file.originalPath);
    var instrumenter = istanbulApi.libInstrument.createInstrumenter(this._getInstrumentationOptions(file));
    var that = this;

    instrumenter.instrument(content, jsPath, function (err, instrumentedCode) {
        if (err) {
            that.log.error('%s\n  at %s', err.message, file.originalPath);
            done(err.message);
        } else {
            if (file.sourceMap && instrumenter.lastSourceMap()) {
                that.log.debug('Adding source map to instrumented file for "%s".', file.originalPath);
                var instrumentedMap = instrumenter.lastSourceMap();
                instrumentedMap.file = file.sourceMap.file = instrumentedMap.file || jsPath;
                var generator = SourceMapGenerator.fromSourceMap(new SourceMapConsumer(instrumentedMap));
                generator.applySourceMap(new SourceMapConsumer(file.sourceMap));
                file.sourceMap = JSON.parse(generator.toString());
                instrumentedCode += '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,';
                instrumentedCode += new Buffer(JSON.stringify(file.sourceMap)).toString('base64') + '\n';
            }

            // remember the actual immediate instrumented JS for given original path
            // sourceFinder.setSource(jsPath, content);

            done(instrumentedCode);
        }
    });
};

function preprocessorFactory(logger, helper, rootConfig, sharedSourceMapStore, coverageConfiguration) {
        var log = logger.create('preprocessor.coverage');

        // if coverage reporter is not used, do not preprocess the files
        if (!_.includes(rootConfig.reporters, 'coverage')) {
            return function (content, file, done) {
                done(content)
            }
        }

        var preprocessor = new Preprocessor(log, helper, coverageConfiguration, sharedSourceMapStore);
        
        return function (content, file, done) {
            preprocessor.applyTo(content, file, done);
        };
    }

preprocessorFactory.$inject = [
    'logger',
    'helper',
    'config',
    'x:coverage-shared-source-map-store',
    'x:coverage-configuration'
];


module.exports = preprocessorFactory;
