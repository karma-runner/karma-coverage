istanbulReports =  require 'istanbul-reports'

reportCreator = require '../lib/report-creator'

describe 'Report Creator', ->

  afterEach ->
    reportCreator.reset()

  describe 'register', ->

    it 'should throw when reporter does not include type', ->
      reporter = {}
      expect(() -> 
        reportCreator.register(reporter)
      ).to.throw

    it 'should complete when report includes a type', ->
      reporter = { TYPE: 'test' }
      expect(reportCreator.register(reporter)).to.be.equal('test')

  describe 'create', ->

    it 'should return custom reporter if registered', ->
      Reporter = sinon.stub()
      Reporter.TYPE = 'test'
      reportCreator.register(Reporter)
      fallbackCreateStub = sinon.stub(istanbulReports, 'create')
      reporterOpts = { test: 'options' }

      reporter = reportCreator.create('test', reporterOpts)

      expect(fallbackCreateStub).not.to.be.called
      expect(Reporter.calledWithNew()).to.be.true
      expect(Reporter).to.be.calledWith(reporterOpts)

    it 'should proxy call to istanbul if custom reporter is not registered', ->
      fallbackCreateStub = sinon.stub(istanbulReports, 'create')
      fallbackCreateStub.returnsThis()
      reporterOpts = { test: 'options' }

      reporter = reportCreator.create('test', reporterOpts)

      expect()
      expect(fallbackCreateStub).to.be.calledWith('test', reporterOpts)
