
var cacheByBasePath = {};

exports.getByBasePath = function (basePath) {
    return cacheByBasePath[basePath] ? cacheByBasePath[basePath] : (cacheByBasePath[basePath] = {});
};
