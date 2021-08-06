const sinon = require('sinon')
const chai = require('chai')

// publish globals that all specs can use
global.expect = chai.expect
global.should = chai.should()
global.sinon = sinon

// chai plugins
chai.use(require('sinon-chai'))

exports.mochaHooks = {
  afterEach () {
    sinon.restore()
  }
}
