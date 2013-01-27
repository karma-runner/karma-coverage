module.exports = {
  'preprocessor:coverage': ['factory', require('./preprocessor')],
  'reporter:coverage': ['type', require('./reporter')]
};
