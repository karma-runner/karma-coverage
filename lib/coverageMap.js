var coverageMap = {};

function addCoverage(coverageObj){
	coverageMap[coverageObj.path] = coverageObj;
}

function getCoverageMap(){
  return coverageMap;
}

function resetCoverage(){
	coverageMap = {};
}

module.exports = {
    add: addCoverage,
    get: getCoverageMap,
    reset: resetCoverage
  };
