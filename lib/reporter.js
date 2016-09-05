// Coverage Reporter
// Part of this code is based on [1], which is licensed under the New BSD License.
// For more information see the See the accompanying LICENSE-istanbul file for terms.
//
// [1]: https://github.com/gotwarlost/istanbul/blob/master/lib/command/check-coverage.js
// =====================
//
// Generates the report

// Dependencies
// ------------

var path = require('path');
var istanbul = require('istanbul-api');

function BrowserResult(browser) {
    this.browser = browser;
    this.coverage = {};
}

BrowserResult.prototype.setCoverage = function (coverage) {
    this.coverage = coverage;
};

function Reporter (log, coverageConfiguration, sharedSourceMapStore) {
    this.log = log;
    this.coverageConfiguration = coverageConfiguration;
    this.sharedSourceMapStore = sharedSourceMapStore;
    this.coverages = {};
}

Reporter.prototype.onRunStart = function () {
    this.coverages = Object.create(null);
};

Reporter.prototype.onBrowserStart = function (browser) {
    this.coverages[browser.id] = new BrowserResult(browser);
};

Reporter.prototype.onBrowserComplete = function (browser, result) {
    var browserCoverage = this.coverages[browser.id];

    if (!browserCoverage) return;
    if (!result || !result.coverage) return;

    browserCoverage.setCoverage(result.coverage);
};

Reporter.prototype.onSpecComplete = function (browser, result) {
    if (!result.coverage) return;
    debugger;
};

Reporter.prototype.onRunComplete = function (browsers) {
    // Write the report for each browser
    var that = this;
    browsers.forEach(function (browser) {
        var coverage = that.coverages[browser.id];
        if (!coverage) {
            return;
        }

        var reporter = that._createBrowserReporter(coverage);
        that._writeCoverage(reporter, coverage);
    });
};

Reporter.prototype._createBrowserReporter = function (browserCoverage) {
    var browserName = browserCoverage.browser.name.replace(':', '');

    var reporter = istanbul.createReporter(this.coverageConfiguration.getIstanbulConfiguration());
    reporter.dir = path.resolve(reporter.dir, browserName);
    reporter.addAll(this.coverageConfiguration.getReportFormats());

    return reporter;
};

Reporter.prototype._writeCoverage = function (reporter, browserCoverage) {
    var coverageMap = istanbul.libCoverage.createCoverageMap(browserCoverage.coverage);
    var transformed = this.sharedSourceMapStore.transformCoverage(coverageMap);
    reporter.write(transformed.map, { sourceFinder: transformed.sourceFinder });
};

Reporter.prototype.onExit = function (done) {
    this.sharedSourceMapStore.dispose();

    done();
};

function reporterFactory(configuration, helper, logger, emitter, sharedSourceMapStore) {
    var log = logger.create('coverage');
    return new Reporter(log, configuration, sharedSourceMapStore);
}

reporterFactory.$inject = ['x:coverage-configuration', 'helper', 'logger', 'emitter', 'x:coverage-shared-source-map-store'];
module.exports = reporterFactory;

