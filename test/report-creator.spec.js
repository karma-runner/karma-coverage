const istanbulReports = require('istanbul-reports')
const reportCreator = require('../lib/report-creator')

describe('Report Creator', () => {
  afterEach(() => reportCreator.reset())

  describe('register', () => {
    it('should throw when reporter does not include type', () => {
      const reporter = {}
      expect(() => reportCreator.register(reporter)).to.throw
    })

    it('should complete when report includes a type', () => {
      const reporter = { TYPE: 'test' }
      expect(reportCreator.register(reporter)).to.be.equal('test')
    })
  })

  describe('create', () => {
    it('should return custom reporter if registered', () => {
      const Reporter = sinon.stub()
      Reporter.TYPE = 'test'
      reportCreator.register(Reporter)
      const fallbackCreateStub = sinon.stub(istanbulReports, 'create')
      const reporterOpts = { test: 'options' }

      reportCreator.create('test', reporterOpts)

      expect(fallbackCreateStub).not.to.be.called
      expect(Reporter.calledWithNew()).to.be.true
      expect(Reporter).to.be.calledWith(reporterOpts)
    })

    it('should proxy call to istanbul if custom reporter is not registered', () => {
      const fallbackCreateStub = sinon.stub(istanbulReports, 'create')
      fallbackCreateStub.returnsThis()
      const reporterOpts = { test: 'options' }

      reportCreator.create('test', reporterOpts)
      expect(fallbackCreateStub).to.be.calledWith('test', reporterOpts)
    })
  })
})
