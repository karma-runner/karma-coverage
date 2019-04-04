sinon = require 'sinon'
chai = require 'chai'

# publish globals that all specs can use
global.expect = chai.expect
global.should = chai.should()
global.sinon = sinon

# chai plugins
chai.use(require 'sinon-chai')

afterEach ->
  global.sinon.restore()
