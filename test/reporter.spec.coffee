#==============================================================================
# lib/reporters/Coverage.js module
#==============================================================================
describe 'reporter', ->
  events = require 'events'
  path = require 'path'

  istanbulLibCoverage = require 'istanbul-lib-coverage'
  istanbulLibReport = require 'istanbul-lib-report'

  globalSourceMapStore = require '../lib/source-map-store'
  globalCoverageMap = require '../lib/coverage-map'
  reports = require '../lib/report-creator'

  # TODO(vojta): remove the dependency on karma
  helper = require '../node_modules/karma/lib/helper'
  Browser = require '../node_modules/karma/lib/browser'
  Collection = require '../node_modules/karma/lib/browser_collection'
  require('../node_modules/karma/lib/logger').setup 'INFO', false, []

  resolve = (v...) -> helper.normalizeWinPath(path.resolve(v...))
  nodeMocks = require 'mocks'
  loadFile = nodeMocks.loadFile
  m = null

  mkdirIfNotExistsStub = sinon.stub()
  mockHelper =
    isDefined: (v) -> helper.isDefined v
    merge: (v...) -> helper.merge v...
    mkdirIfNotExists: mkdirIfNotExistsStub
    normalizeWinPath: (path) -> helper.normalizeWinPath path

  # Mock Objects
  mockCoverageSummary = null
  mockFileCoverage = null
  mockCoverageMap = null
  mockDefaultWatermarks = null
  mockPackageSummary = null
  mockSourceMapStore = null
  mockGlobalCoverageMap = null

  # Stubs
  createCoverageSummaryStub = null
  createCoverageMapStub = null
  createContextStub = null
  packageSummaryStub = null
  getDefaultWatermarkStub = null
  sourceMapStoreGetStub = null
  globalCoverageMapGetStub = null
  globalCoverageMapAddStub = null
  reportCreateStub = null

  mockFs =
    writeFile: sinon.spy()

  mocks =
    fs: mockFs

  beforeEach ->
    mockCoverageSummary =
      merge: sinon.stub()
      toJSON: sinon.stub()
    mockFileCoverage =
      merge: sinon.stub()
      toJSON: sinon.stub()
      toSummary: sinon.stub()
    mockFileCoverage.toSummary.returns mockCoverageSummary
    mockCoverageMap =
      fileCoverageFor: sinon.stub()
      files: sinon.stub()
      merge: sinon.stub()
      toJSON: sinon.stub()
    mockCoverageMap.fileCoverageFor.returns mockFileCoverage
    createCoverageSummaryStub = sinon.stub(istanbulLibCoverage, 'createCoverageSummary')
    createCoverageSummaryStub.returns mockCoverageSummary
    createCoverageMapStub = sinon.stub(istanbulLibCoverage, 'createCoverageMap')
    createCoverageMapStub.returns mockCoverageMap

    mockDefaultWatermarks =
      statements: [50, 80]
      branches: [50, 80]
      functions: [50, 80]
      lines: [50, 80]
    mockPackageSummary = 
      visit: sinon.stub()
    createContextStub = sinon.stub(istanbulLibReport, 'createContext')
    packageSummaryStub = sinon.stub(istanbulLibReport.summarizers, 'pkg')
    packageSummaryStub.returns mockPackageSummary
    getDefaultWatermarkStub = sinon.stub(istanbulLibReport, 'getDefaultWatermarks')
    getDefaultWatermarkStub.returns mockDefaultWatermarks

    mockSourceMapStore = {
      transformCoverage: sinon.stub()
    }
    mockSourceMapStore.transformCoverage.returns { map: mockCoverageMap }
    sourceMapStoreGetStub = sinon.stub(globalSourceMapStore, 'get')
    sourceMapStoreGetStub.returns mockSourceMapStore

    mockGlobalCoverageMap = {}
    globalCoverageMapGetStub = sinon.stub(globalCoverageMap, 'get')
    globalCoverageMapGetStub.returns mockGlobalCoverageMap
    globalCoverageMapAddStub = sinon.stub(globalCoverageMap, 'add')

    reportCreateStub = sinon.stub(reports, 'create')

    m = loadFile __dirname + '/../lib/reporter.js', mocks

  describe 'CoverageReporter', ->
    rootConfig = emitter = reporter = null
    browsers = fakeChrome = fakeOpera = null
    mockLogger = create: (name) ->
      debug: -> null
      info: -> null
      warn: -> null
      error: -> null

    beforeEach ->
      rootConfig =
        basePath: '/base'
        coverageReporter: dir: 'path/to/coverage/'
      emitter = new events.EventEmitter
      reporter = new m.CoverageReporter rootConfig, mockHelper, mockLogger, emitter
      browsers = new Collection emitter
      # fake user agent only for testing
      # cf. helper.browserFullNameToShort
      fakeChrome = new Browser 'aaa', 'Windows NT 6.1 Chrome/16.0.912.75', browsers, emitter
      fakeOpera = new Browser 'bbb', 'Opera/9.80 Mac OS X Version/12.00', browsers, emitter
      browsers.add fakeChrome
      browsers.add fakeOpera
      reporter.onRunStart()
      browsers.forEach (b) -> reporter.onBrowserStart b
      mkdirIfNotExistsStub.resetHistory()

    it 'has no pending file writings', ->
      done = sinon.spy()
      reporter.onExit done
      expect(done).to.have.been.called

    it 'has no coverage', ->
      result =
        coverage: null
      reporter.onBrowserComplete fakeChrome, result
      expect(mockCoverageMap.merge).not.to.have.been.called

    it 'should handle no result', ->
      reporter.onBrowserComplete fakeChrome, undefined
      expect(mockCoverageMap.merge).not.to.have.been.called

    it 'should make reports', ->
      reporter.onRunComplete browsers
      expect(mkdirIfNotExistsStub).to.have.been.calledTwice
      dir = rootConfig.coverageReporter.dir
      expect(mkdirIfNotExistsStub.getCall(0).args[0]).to.deep.equal resolve('/base', dir, fakeChrome.name)
      expect(mkdirIfNotExistsStub.getCall(1).args[0]).to.deep.equal resolve('/base', dir, fakeOpera.name)
      mkdirIfNotExistsStub.getCall(0).args[1]()
      expect(reportCreateStub).to.have.been.called
      expect(mockPackageSummary.visit).to.have.been.called
      createArgs = reportCreateStub.getCall(0).args
      expect(createArgs[0]).to.be.equal 'html'
      expect(createArgs[1].browser).to.be.equal fakeChrome
      expect(createArgs[1].emitter).to.be.equal emitter

    it 'should support a string for the subdir option', ->
      customConfig = helper.merge {}, rootConfig,
        coverageReporter:
          subdir: 'test'

      reporter = new m.CoverageReporter customConfig, mockHelper, mockLogger
      reporter.onRunStart()
      browsers.forEach (b) -> reporter.onBrowserStart b

      reporter.onRunComplete browsers
      expect(mkdirIfNotExistsStub).to.have.been.calledTwice
      dir = customConfig.coverageReporter.dir
      subdir = customConfig.coverageReporter.subdir
      expect(mkdirIfNotExistsStub.getCall(0).args[0]).to.deep.equal resolve('/base', dir, subdir)
      expect(mkdirIfNotExistsStub.getCall(1).args[0]).to.deep.equal resolve('/base', dir, subdir)
      mkdirIfNotExistsStub.getCall(0).args[1]()
      expect(reportCreateStub).to.have.been.called
      expect(mockPackageSummary.visit).to.have.been.called

    it 'should support a function for the subdir option', ->
      customConfig = helper.merge {}, rootConfig,
        coverageReporter:
          subdir: (browserName) -> browserName.toLowerCase().split(/[ /-]/)[0]

      reporter = new m.CoverageReporter customConfig, mockHelper, mockLogger
      reporter.onRunStart()
      browsers.forEach (b) -> reporter.onBrowserStart b

      reporter.onRunComplete browsers
      expect(mkdirIfNotExistsStub).to.have.been.calledTwice
      dir = customConfig.coverageReporter.dir
      expect(mkdirIfNotExistsStub.getCall(0).args[0]).to.deep.equal resolve('/base', dir, 'chrome')
      expect(mkdirIfNotExistsStub.getCall(1).args[0]).to.deep.equal resolve('/base', dir, 'opera')
      mkdirIfNotExistsStub.getCall(0).args[1]()
      expect(reportCreateStub).to.have.been.called
      expect(mockPackageSummary.visit).to.have.been.called

    it 'should support a specific dir and subdir per reporter', ->
      customConfig = helper.merge {}, rootConfig,
        coverageReporter:
          dir: 'useless'
          subdir: 'useless'
          reporters: [
            {
              dir: 'reporter1'
              subdir: (browserName) -> browserName.toLowerCase().split(/[ /-]/)[0]
            }
            {
              dir: 'reporter2'
              subdir: (browserName) -> browserName.toUpperCase().split(/[ /-]/)[0]
            }
          ]

      reporter = new m.CoverageReporter customConfig, mockHelper, mockLogger
      reporter.onRunStart()
      browsers.forEach (b) -> reporter.onBrowserStart b

      reporter.onRunComplete browsers
      expect(mkdirIfNotExistsStub.callCount).to.equal 4
      expect(mkdirIfNotExistsStub.getCall(0).args[0]).to.deep.equal resolve('/base', 'reporter1', 'chrome')
      expect(mkdirIfNotExistsStub.getCall(1).args[0]).to.deep.equal resolve('/base', 'reporter1', 'opera')
      expect(mkdirIfNotExistsStub.getCall(2).args[0]).to.deep.equal resolve('/base', 'reporter2', 'CHROME')
      expect(mkdirIfNotExistsStub.getCall(3).args[0]).to.deep.equal resolve('/base', 'reporter2', 'OPERA')
      mkdirIfNotExistsStub.getCall(0).args[1]()
      expect(reportCreateStub).to.have.been.called
      expect(mockPackageSummary.visit).to.have.been.called

    it 'should fallback to the default dir/subdir if not provided', ->
      customConfig = helper.merge {}, rootConfig,
        coverageReporter:
          dir: 'defaultdir'
          subdir: 'defaultsubdir'
          reporters: [
            {
              dir: 'reporter1'
            }
            {
              subdir: (browserName) -> browserName.toUpperCase().split(/[ /-]/)[0]
            }
          ]

      reporter = new m.CoverageReporter customConfig, mockHelper, mockLogger
      reporter.onRunStart()
      browsers.forEach (b) -> reporter.onBrowserStart b

      reporter.onRunComplete browsers
      expect(mkdirIfNotExistsStub.callCount).to.equal 4
      expect(mkdirIfNotExistsStub.getCall(0).args[0]).to.deep.equal resolve('/base', 'reporter1', 'defaultsubdir')
      expect(mkdirIfNotExistsStub.getCall(1).args[0]).to.deep.equal resolve('/base', 'reporter1', 'defaultsubdir')
      expect(mkdirIfNotExistsStub.getCall(2).args[0]).to.deep.equal resolve('/base', 'defaultdir', 'CHROME')
      expect(mkdirIfNotExistsStub.getCall(3).args[0]).to.deep.equal resolve('/base', 'defaultdir', 'OPERA')
      mkdirIfNotExistsStub.getCall(0).args[1]()
      expect(reportCreateStub).to.have.been.called
      expect(mockPackageSummary.visit).to.have.been.called

    it 'should not create directory if reporting text* to console', ->
      run = ->
        reporter = new m.CoverageReporter rootConfig, mockHelper, mockLogger
        reporter.onRunStart()
        browsers.forEach (b) -> reporter.onBrowserStart b
        reporter.onRunComplete browsers

      rootConfig.coverageReporter.reporters = [
        { type: 'text' }
        { type: 'text-summary' }
      ]
      run()
      expect(mkdirIfNotExistsStub).not.to.have.been.called

    it 'should create directory if reporting text* to file', ->
      run = ->
        reporter = new m.CoverageReporter rootConfig, mockHelper, mockLogger
        reporter.onRunStart()
        browsers.forEach (b) -> reporter.onBrowserStart b
        reporter.onRunComplete browsers

      rootConfig.coverageReporter.reporters = [{ type: 'text', file: 'file' }]
      run()
      expect(mkdirIfNotExistsStub).to.have.been.calledTwice

      mkdirIfNotExistsStub.resetHistory()
      rootConfig.coverageReporter.reporters = [{ type: 'text-summary', file: 'file' }]
      run()
      expect(mkdirIfNotExistsStub).to.have.been.calledTwice

    it 'should support including all sources', ->
      customConfig = helper.merge {}, rootConfig,
        coverageReporter:
          dir: 'defaultdir'
          includeAllSources: true

      globalCoverageMapGetStub.resetHistory()
      createCoverageMapStub.resetHistory()

      reporter = new m.CoverageReporter customConfig, mockHelper, mockLogger
      reporter.onRunStart()
      browsers.forEach (b) -> reporter.onBrowserStart b

      expect(globalCoverageMapGetStub).to.have.been.called
      expect(createCoverageMapStub).to.have.been.calledWith globalCoverageMapGetStub.returnValues[0]

    it 'should not retrieve the coverageMap if we aren\'t including all sources', ->
      customConfig = helper.merge {}, rootConfig,
        coverageReporter:
          dir: 'defaultdir'
          includeAllSources: false

      globalCoverageMapGetStub.resetHistory()

      reporter = new m.CoverageReporter customConfig, mockHelper, mockLogger
      reporter.onRunStart()
      browsers.forEach (b) -> reporter.onBrowserStart b

      expect(globalCoverageMapGetStub).not.to.have.been.called

    it 'should default to not including all sources', ->
      customConfig = helper.merge {}, rootConfig,
        coverageReporter:
          dir: 'defaultdir'

      globalCoverageMapGetStub.resetHistory()

      reporter = new m.CoverageReporter customConfig, mockHelper, mockLogger
      reporter.onRunStart()
      browsers.forEach (b) -> reporter.onBrowserStart b

      expect(globalCoverageMapGetStub).not.to.have.been.called

    it 'should pass watermarks to istanbul', ->
      watermarks =
        statements: [10, 20]
        branches: [30, 40]
        functions: [50, 60]
        lines: [70, 80]

      customConfig = helper.merge {}, rootConfig,
        coverageReporter:
          reporters: [
            {
              dir: 'reporter1'
            }
          ]
          watermarks: watermarks

      reportCreateStub.resetHistory()
      createContextStub.resetHistory()

      reporter = new m.CoverageReporter customConfig, mockHelper, mockLogger
      reporter.onRunStart()
      browsers.forEach (b) -> reporter.onBrowserStart b
      reporter.onRunComplete browsers

      expect(createContextStub).to.have.been.called
      expect(reportCreateStub).to.have.been.called
      options = reportCreateStub.getCall(0)
      expect(options.args[1].watermarks).to.deep.equal(watermarks)

    it 'should merge with istanbul default watermarks', ->
      watermarks =
        statements: [10, 20]
        lines: [70, 80]

      customConfig = helper.merge {}, rootConfig,
        coverageReporter:
          reporters: [
            {
              dir: 'reporter1'
            }
          ]
          watermarks: watermarks

      reportCreateStub.resetHistory()
      createContextStub.resetHistory()

      reporter = new m.CoverageReporter customConfig, mockHelper, mockLogger
      reporter.onRunStart()
      browsers.forEach (b) -> reporter.onBrowserStart b
      reporter.onRunComplete browsers

      expect(createContextStub).to.have.been.called
      expect(reportCreateStub).to.have.been.called
      options = reportCreateStub.getCall(0)
      expect(options.args[1].watermarks.statements).to.deep.equal(watermarks.statements)
      expect(options.args[1].watermarks.branches).to.deep.equal(mockDefaultWatermarks.branches)
      expect(options.args[1].watermarks.functions).to.deep.equal(mockDefaultWatermarks.functions)
      expect(options.args[1].watermarks.lines).to.deep.equal(watermarks.lines)

    it 'should log errors on low coverage and fail the build', ->
      customConfig = helper.merge {}, rootConfig,
        coverageReporter:
          check:
            each:
              statements: 50

      mockCoverageMap.files.returns ['./foo/bar.js', './foo/baz.js']
      mockCoverageSummary.toJSON.returns
        lines:      {total: 5, covered: 1, skipped: 0, pct: 20},
        statements: {total: 5, covered: 1, skipped: 0, pct: 20},
        functions:  {total: 5, covered: 1, skipped: 0, pct: 20},
        branches:   {total: 5, covered: 1, skipped: 0, pct: 20}

      spy1 = sinon.spy()

      customLogger = create: (name) ->
        debug: -> null
        info: -> null
        warn: -> null
        error: spy1

      results = exitCode: 0

      reporter = new m.CoverageReporter customConfig, mockHelper, customLogger
      reporter.onRunStart()
      browsers.forEach (b) -> reporter.onBrowserStart b
      reporter.onRunComplete browsers, results

      expect(spy1).to.have.been.called

      expect(results.exitCode).to.not.equal 0

    it 'should not log errors on sufficient coverage and not fail the build', ->
      customConfig = helper.merge {}, rootConfig,
        coverageReporter:
          check:
            each:
              statements: 10

      mockCoverageMap.files.returns ['./foo/bar.js', './foo/baz.js']
      mockCoverageSummary.toJSON.returns
        lines:      {total: 5, covered: 1, skipped: 0, pct: 20},
        statements: {total: 5, covered: 1, skipped: 0, pct: 20},
        functions:  {total: 5, covered: 1, skipped: 0, pct: 20},
        branches:   {total: 5, covered: 1, skipped: 0, pct: 20}

      spy1 = sinon.spy()

      customLogger = create: (name) ->
        debug: -> null
        info: -> null
        warn: -> null
        error: spy1

      results = exitCode: 0

      reporter = new m.CoverageReporter customConfig, mockHelper, customLogger
      reporter.onRunStart()
      browsers.forEach (b) -> reporter.onBrowserStart b
      reporter.onRunComplete browsers, results

      expect(spy1).to.not.have.been.called

      expect(results.exitCode).to.equal 0
