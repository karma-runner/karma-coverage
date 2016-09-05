var istanbulApi = require('istanbul-api');
var _ = require("lodash");

function CoverageConfiguration(coverageConfiguration) {
    this.coverageConfiguration = coverageConfiguration || {};
    this.istanbulConfiguration = istanbulApi.config.loadObject(_.omit(this.coverageConfiguration, 'instrument'));
}

Object.defineProperty(CoverageConfiguration.prototype, "instrument", {
    enumerable: true,
    get: function () {
        return this.coverageConfiguration.instrument !== false;
    }
});

CoverageConfiguration.prototype.getInstrumenterOpts = function () {
    return this.istanbulConfiguration.instrumentation.getInstrumenterOpts()
};

CoverageConfiguration.prototype.getIstanbulConfiguration = function () {
    return this.istanbulConfiguration;
};

CoverageConfiguration.prototype.getReportFormats = function () {
    return this.istanbulConfiguration.reporting.reports() || ["html"];
};

function loadConfiguration(coverageConfiguration) {

    return new CoverageConfiguration(coverageConfiguration);
}

module.exports = { loadConfiguration: loadConfiguration };