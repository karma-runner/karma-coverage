#==============================================================================
# lib/reporters/Coverage.js module
#==============================================================================
describe 'reporter', ->
  events = require 'events'
  path = require 'path'
  istanbul = require 'istanbul'

  # TODO(vojta): remove the dependency on karma
  helper = require '../node_modules/karma/lib/helper'
  browser = require '../node_modules/karma/lib/browser'
  require('../node_modules/karma/lib/logger').setup 'INFO', false, []

  Browser = browser.Browser
  Collection = browser.Collection
  nodeMocks = require 'mocks'
  loadFile = nodeMocks.loadFile
  m = null

  mockFs =
    writeFile: sinon.spy()

  mockStore = sinon.spy()
  mockStore.mix = (fn, obj) ->
    istanbul.Store.mix fn, obj

  mockAdd = sinon.spy()
  mockDispose = sinon.spy()
  mockCollector = class Collector
    add: mockAdd
    dispose: mockDispose
    getFinalCoverage: -> null
  mockWriteReport = sinon.spy()
  mockReportCreate = sinon.stub().returns writeReport: mockWriteReport
  mockMkdir = sinon.spy()
  mockHelper =
    isDefined: (v) -> helper.isDefined v
    merge: (v...) -> helper.merge v...
    mkdirIfNotExists: mockMkdir

  mocks =
    fs: mockFs
    istanbul:
      Store: mockStore
      Collector: mockCollector
      Report: create: mockReportCreate
    dateformat: require 'dateformat'

  beforeEach ->
    m = loadFile __dirname + '/../lib/reporter.js', mocks

  describe 'SourceCacheStore', ->
    options = store = null

    beforeEach ->
      options =
        sourceCache: { './foo': 'TEST_SRC_DATA' }
      store = new m.SourceCacheStore options

    it 'should fail on call to keys', ->
      expect(-> store.keys()).to.throw()

    it 'should call get and check cache data', ->
      expect(store.get('./foo')).to.equal 'TEST_SRC_DATA'

    it 'should call hasKey and check cache data', ->
      expect(store.hasKey('./foo')).to.be.true
      expect(store.hasKey('./bar')).to.be.false

    it 'should fail on call to set', ->
      expect(-> store.set()).to.throw()

  describe 'CoverageReporter', ->
    rootConfig = emitter = reporter = null
    browsers = fakeChrome = fakeOpera = null
    mockLogger = create: (name) ->
      debug: -> null
      info: -> null
      warn: -> null
      error: -> null

    makeBrowser = (id, name, collection, emitter) ->
      browser = new Browser id, collection, emitter
      browser.onRegister
        id: id + name
        name: name
      browser

    beforeEach ->
      rootConfig =
        coverageReporter: dir: 'path/to/coverage/'
      emitter = new events.EventEmitter
      reporter = new m.CoverageReporter rootConfig, emitter, mockHelper, mockLogger
      browsers = new Collection emitter
      # fake user agent only for testing
      # cf. helper.browserFullNameToShort
      fakeChrome = makeBrowser 'aaa', 'Windows NT 6.1 Chrome/16.0.912.75', browsers, emitter
      fakeOpera = makeBrowser 'bbb', 'Opera/9.80 Mac OS X Version/12.00', browsers, emitter
      browsers.add fakeChrome
      browsers.add fakeOpera
      reporter.onRunStart browsers
      mockFs.writeFile.reset()
      mockMkdir.reset()

    it 'has no pending file writings', ->
      done = sinon.spy()
      emitter.emit 'exit', done
      expect(done).to.have.been.called

    it 'has no coverage', ->
      result =
        coverage: null
      reporter.onBrowserComplete fakeChrome, result
      expect(mockAdd).not.to.have.been.called

    it 'should handle no result', ->
      reporter.onBrowserComplete fakeChrome, undefined
      expect(mockAdd).not.to.have.been.called

    it 'should store coverage json', ->
      result =
        coverage:
          aaa: 1
          bbb: 2
      reporter.onBrowserComplete fakeChrome, result
      expect(mockAdd).to.have.been.calledWith result.coverage
      expect(mockMkdir).to.have.been.called
      args = mockMkdir.lastCall.args
      expect(args[0]).to.deep.equal path.resolve(rootConfig.coverageReporter.dir)
      args[1]()
      expect(mockFs.writeFile).to.have.been.calledWith
      args2 = mockFs.writeFile.lastCall.args
      # expect(args2[1]).to.deep.equal JSON.stringify(result.coverage)

    it 'should make reports', ->
      reporter.onRunComplete browsers
      expect(mockMkdir).to.have.been.calledTwice
      dir = rootConfig.coverageReporter.dir
      expect(mockMkdir.getCall(0).args[0]).to.deep.equal path.resolve(dir, fakeChrome.name)
      expect(mockMkdir.getCall(1).args[0]).to.deep.equal path.resolve(dir, fakeOpera.name)
      mockMkdir.getCall(0).args[1]()
      expect(mockReportCreate).to.have.been.called
      expect(mockWriteReport).to.have.been.called
