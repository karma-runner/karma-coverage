// karma-coverage
// ==============
//
// Main entry point for the karma-coverage module.
// Exposes the preprocessor and reporter plugins.

var istanbulApi = require("istanbul-api");
var preprocessorFactory = require("./preprocessor");
var configuration = require("./configuration");
var reporterFactory = require("./reporter");

function createConfiguration(coverageConfiguration) {
    return configuration.loadConfiguration(coverageConfiguration || {});
}

createConfiguration.$inject = ['config.coverage'];

function createSharedSourceMapStore(basePath) {
    return istanbulApi.libSourceMaps.createSourceMapStore({ baseDir: basePath });
}

createSharedSourceMapStore.$inject = [ 'config.basePath' ];

module.exports = {
    'preprocessor:coverage': ['factory', preprocessorFactory],
    'reporter:coverage': ['factory', reporterFactory],
    'x:coverage-configuration': ['factory', createConfiguration],
    'x:coverage-shared-source-map-store': ['factory', createSharedSourceMapStore ]
};
