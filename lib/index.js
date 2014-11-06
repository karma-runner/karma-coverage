module.exports = {
  'preprocessor:coverage': ['factory', require('./preprocessor').createCoveragePreprocessor],
  'reporter:coverage': ['type', require('./reporter')]
};
