// ==============================================================================
// lib/reporters/Coverage.js module
// ==============================================================================
const events = require('events')
const path = require('path')

const istanbulLibCoverage = require('istanbul-lib-coverage')
const istanbulLibReport = require('istanbul-lib-report')

const globalSourceMapStore = require('../lib/source-map-store')
const globalCoverageMap = require('../lib/coverage-map')
const reports = require('../lib/report-creator')

describe('reporter', () => {
  // TODO(vojta): remove the dependency on karma
  const helper = require('../node_modules/karma/lib/helper')
  const Browser = require('../node_modules/karma/lib/browser')
  const Collection = require('../node_modules/karma/lib/browser_collection')
  require('karma/lib/logger').setup('INFO', false, [])

  const resolve = (...args) => helper.normalizeWinPath(path.resolve(...args))
  const nodeMocks = require('mocks')
  const loadFile = nodeMocks.loadFile
  let m = null

  const mkdirIfNotExistsStub = sinon.stub()
  const mockHelper = {
    isDefined: (v) => helper.isDefined(v),
    merge: (...arg) => helper.merge(...arg),
    mkdirIfNotExists: (dir, done) => {
      mkdirIfNotExistsStub(dir, done)
      setTimeout(done, 0)
    },
    normalizeWinPath: (path) => helper.normalizeWinPath(path)
  }

  // Mock Objects
  let mockCoverageSummary = null
  let mockFileCoverage = null
  let mockCoverageMap = null
  let mockDefaultWatermarks = null
  let mockPackageSummary = null
  let mockSourceMapStore = null
  let mockGlobalCoverageMap = null

  // Stubs
  let createCoverageSummaryStub = null
  let createCoverageMapStub = null
  let createContextStub = null
  let getDefaultWatermarkStub = null
  let sourceMapStoreGetStub = null
  let globalCoverageMapGetStub = null
  let reportCreateStub = null

  const mockFs = { writeFile: sinon.spy() }
  const mocks = { fs: mockFs }

  beforeEach(() => {
    mockCoverageSummary = {
      merge: sinon.stub(),
      toJSON: sinon.stub()
    }
    mockFileCoverage = {
      merge: sinon.stub(),
      toJSON: sinon.stub(),
      toSummary: sinon.stub()
    }
    mockFileCoverage.toSummary.returns(mockCoverageSummary)
    mockCoverageMap = {
      fileCoverageFor: sinon.stub(),
      files: sinon.stub(),
      merge: sinon.stub(),
      toJSON: sinon.stub()
    }
    mockCoverageMap.fileCoverageFor.returns(mockFileCoverage)
    createCoverageSummaryStub = sinon.stub(istanbulLibCoverage, 'createCoverageSummary')
    createCoverageSummaryStub.returns(mockCoverageSummary)
    createCoverageMapStub = sinon.stub(istanbulLibCoverage, 'createCoverageMap')
    createCoverageMapStub.returns(mockCoverageMap)

    mockDefaultWatermarks = {
      statements: [50, 80],
      branches: [50, 80],
      functions: [50, 80],
      lines: [50, 80]
    }
    createContextStub = sinon.stub(istanbulLibReport, 'createContext')
    getDefaultWatermarkStub = sinon.stub(istanbulLibReport, 'getDefaultWatermarks')
    getDefaultWatermarkStub.returns(mockDefaultWatermarks)

    mockSourceMapStore = {
      transformCoverage: sinon.stub()
    }
    mockSourceMapStore.transformCoverage.resolves(mockCoverageMap)
    sourceMapStoreGetStub = sinon.stub(globalSourceMapStore, 'get')
    sourceMapStoreGetStub.returns(mockSourceMapStore)

    mockGlobalCoverageMap = {}
    globalCoverageMapGetStub = sinon.stub(globalCoverageMap, 'get')
    globalCoverageMapGetStub.returns(mockGlobalCoverageMap)
    sinon.stub(globalCoverageMap, 'add')

    mockPackageSummary = { execute: sinon.stub() }
    reportCreateStub = sinon.stub(reports, 'create')
    reportCreateStub.returns(mockPackageSummary)

    m = loadFile(path.join(__dirname, '/../lib/reporter.js'), mocks)
  })

  describe('CoverageReporter', () => {
    let rootConfig = null
    let emitter = null
    let reporter = null
    let browsers = null
    let fakeChrome = null
    let fakeOpera = null
    const mockLogger = {
      create: (name) => {
        return {
          debug () {},
          info () {},
          warn () {},
          error () {}
        }
      }
    }

    beforeEach(() => {
      rootConfig = {
        basePath: '/base',
        coverageReporter: { dir: 'path/to/coverage/' }
      }
      emitter = new events.EventEmitter()
      reporter = new m.CoverageReporter(rootConfig, mockHelper, mockLogger, emitter)
      browsers = new Collection(emitter)
      // fake user agent only for testing
      // cf. helper.browserFullNameToShort
      fakeChrome = new Browser('aaa', 'Windows NT 6.1 Chrome/16.0.912.75', browsers, emitter)
      fakeOpera = new Browser('bbb', 'Opera/9.80 Mac OS X Version/12.00', browsers, emitter)
      browsers.add(fakeChrome)
      browsers.add(fakeOpera)
      reporter.onRunStart()
      browsers.forEach(b => reporter.onBrowserStart(b))
      mkdirIfNotExistsStub.resetHistory()
    })

    it('has no pending file writings', async () => {
      const done = sinon.spy()
      await reporter.onExit(done)
      expect(done).to.have.been.called
    })

    it('has no coverage', () => {
      const result = {
        coverage: null
      }
      reporter.onBrowserComplete(fakeChrome, result)
      expect(mockCoverageMap.merge).not.to.have.been.called
    })

    it('should handle no result', () => {
      reporter.onBrowserComplete(fakeChrome, undefined)
      expect(mockCoverageMap.merge).not.to.have.been.called
    })

    it('should make reports', async () => {
      await reporter.onRunComplete(browsers)
      expect(mkdirIfNotExistsStub).to.have.been.calledTwice
      const dir = rootConfig.coverageReporter.dir
      expect(mkdirIfNotExistsStub.getCall(0).args[0]).to.deep.equal(resolve('/base', dir, fakeChrome.name))
      expect(mkdirIfNotExistsStub.getCall(1).args[0]).to.deep.equal(resolve('/base', dir, fakeOpera.name))
      expect(reportCreateStub).to.have.been.called
      expect(mockPackageSummary.execute).to.have.been.called
      const createArgs = reportCreateStub.getCall(0).args
      expect(createArgs[0]).to.be.equal('html')
      expect(createArgs[1].browser).to.be.equal(fakeChrome)
      expect(createArgs[1].emitter).to.be.equal(emitter)
    })

    it('should support a string for the subdir option', async () => {
      const customConfig = helper.merge({}, rootConfig, {
        coverageReporter: {
          subdir: 'test'
        }
      })

      reporter = new m.CoverageReporter(customConfig, mockHelper, mockLogger)
      reporter.onRunStart()
      browsers.forEach(b => reporter.onBrowserStart(b))

      await reporter.onRunComplete(browsers)
      expect(mkdirIfNotExistsStub).to.have.been.calledTwice
      const dir = customConfig.coverageReporter.dir
      const subdir = customConfig.coverageReporter.subdir
      expect(mkdirIfNotExistsStub.getCall(0).args[0]).to.deep.equal(resolve('/base', dir, subdir))
      expect(mkdirIfNotExistsStub.getCall(1).args[0]).to.deep.equal(resolve('/base', dir, subdir))
      expect(reportCreateStub).to.have.been.called
      expect(mockPackageSummary.execute).to.have.been.called
    })

    it('should support a function for the subdir option', async () => {
      const customConfig = helper.merge({}, rootConfig, {
        coverageReporter: {
          subdir: (browserName) => browserName.toLowerCase().split(/[ /-]/)[0]
        }
      })

      reporter = new m.CoverageReporter(customConfig, mockHelper, mockLogger)
      reporter.onRunStart()
      browsers.forEach(b => reporter.onBrowserStart(b))

      await reporter.onRunComplete(browsers)
      expect(mkdirIfNotExistsStub).to.have.been.calledTwice
      const dir = customConfig.coverageReporter.dir
      expect(mkdirIfNotExistsStub.getCall(0).args[0]).to.deep.equal(resolve('/base', dir, 'chrome'))
      expect(mkdirIfNotExistsStub.getCall(1).args[0]).to.deep.equal(resolve('/base', dir, 'opera'))
      expect(reportCreateStub).to.have.been.called
      expect(mockPackageSummary.execute).to.have.been.called
    })

    it('should support a specific dir and subdir per reporter', async () => {
      const customConfig = helper.merge({}, rootConfig, {
        coverageReporter: {
          dir: 'useless',
          subdir: 'useless',
          reporters: [
            {
              dir: 'reporter1',
              subdir: (browserName) => browserName.toLowerCase().split(/[ /-]/)[0]
            },
            {
              dir: 'reporter2',
              subdir: (browserName) => browserName.toUpperCase().split(/[ /-]/)[0]
            }
          ]
        }
      })

      reporter = new m.CoverageReporter(customConfig, mockHelper, mockLogger)
      reporter.onRunStart()
      browsers.forEach(b => reporter.onBrowserStart(b))

      await reporter.onRunComplete(browsers)
      expect(mkdirIfNotExistsStub.callCount).to.equal(4)
      expect(mkdirIfNotExistsStub.getCall(0).args[0]).to.deep.equal(resolve('/base', 'reporter1', 'chrome'))
      expect(mkdirIfNotExistsStub.getCall(1).args[0]).to.deep.equal(resolve('/base', 'reporter1', 'opera'))
      expect(mkdirIfNotExistsStub.getCall(2).args[0]).to.deep.equal(resolve('/base', 'reporter2', 'CHROME'))
      expect(mkdirIfNotExistsStub.getCall(3).args[0]).to.deep.equal(resolve('/base', 'reporter2', 'OPERA'))
      expect(reportCreateStub).to.have.been.called
      expect(mockPackageSummary.execute).to.have.been.called
    })

    it('should fallback to the default dir/subdir if not provided', async () => {
      const customConfig = helper.merge({}, rootConfig, {
        coverageReporter: {
          dir: 'defaultdir',
          subdir: 'defaultsubdir',
          reporters: [
            {
              dir: 'reporter1'
            },
            {
              subdir: (browserName) => browserName.toUpperCase().split(/[ /-]/)[0]
            }
          ]
        }
      })

      reporter = new m.CoverageReporter(customConfig, mockHelper, mockLogger)
      reporter.onRunStart()
      browsers.forEach(b => reporter.onBrowserStart(b))

      await reporter.onRunComplete(browsers)
      expect(mkdirIfNotExistsStub.callCount).to.equal(4)
      expect(mkdirIfNotExistsStub.getCall(0).args[0]).to.deep.equal(resolve('/base', 'reporter1', 'defaultsubdir'))
      expect(mkdirIfNotExistsStub.getCall(1).args[0]).to.deep.equal(resolve('/base', 'reporter1', 'defaultsubdir'))
      expect(mkdirIfNotExistsStub.getCall(2).args[0]).to.deep.equal(resolve('/base', 'defaultdir', 'CHROME'))
      expect(mkdirIfNotExistsStub.getCall(3).args[0]).to.deep.equal(resolve('/base', 'defaultdir', 'OPERA'))
      expect(reportCreateStub).to.have.been.called
      expect(mockPackageSummary.execute).to.have.been.called
    })

    it('should not create directory if reporting text* to console', async () => {
      const run = () => {
        reporter = new m.CoverageReporter(rootConfig, mockHelper, mockLogger)
        reporter.onRunStart()
        browsers.forEach(b => reporter.onBrowserStart(b))
        return reporter.onRunComplete(browsers)
      }

      rootConfig.coverageReporter.reporters = [
        { type: 'text' },
        { type: 'text-summary' }
      ]
      await run()
      expect(mkdirIfNotExistsStub).not.to.have.been.called
    })

    it('should calls done callback when onComplete event will be complete', async () => {
      reporter = new m.CoverageReporter(rootConfig, mockHelper, mockLogger)
      reporter.onRunStart()
      browsers.forEach(b => reporter.onBrowserStart(b))
      reporter.onRunComplete(browsers)
      const done = sinon.stub()

      const promiseExit = reporter.onExit(done)

      expect(done.notCalled).to.be.true
      await promiseExit
      expect(done.calledOnce).to.be.true
    })

    it('should create directory if reporting text* to file', async () => {
      const run = () => {
        reporter = new m.CoverageReporter(rootConfig, mockHelper, mockLogger)
        reporter.onRunStart()
        browsers.forEach(b => reporter.onBrowserStart(b))
        return reporter.onRunComplete(browsers)
      }

      rootConfig.coverageReporter.reporters = [{ type: 'text', file: 'file' }]
      await run()
      expect(mkdirIfNotExistsStub).to.have.been.calledTwice

      mkdirIfNotExistsStub.resetHistory()
      rootConfig.coverageReporter.reporters = [{ type: 'text-summary', file: 'file' }]
      await run()
      expect(mkdirIfNotExistsStub).to.have.been.calledTwice
    })

    it('should support including all sources', () => {
      const customConfig = helper.merge({}, rootConfig, {
        coverageReporter: {
          dir: 'defaultdir',
          includeAllSources: true
        }
      })

      globalCoverageMapGetStub.resetHistory()
      createCoverageMapStub.resetHistory()

      reporter = new m.CoverageReporter(customConfig, mockHelper, mockLogger)
      reporter.onRunStart()
      browsers.forEach(b => reporter.onBrowserStart(b))

      expect(globalCoverageMapGetStub).to.have.been.called
      expect(createCoverageMapStub).to.have.been.calledWith(globalCoverageMapGetStub.returnValues[0])
    })

    it('should not retrieve the coverageMap if we aren\'t including all sources', () => {
      const customConfig = helper.merge({}, rootConfig, {
        coverageReporter: {
          dir: 'defaultdir',
          includeAllSources: false
        }
      })

      globalCoverageMapGetStub.resetHistory()

      reporter = new m.CoverageReporter(customConfig, mockHelper, mockLogger)
      reporter.onRunStart()
      browsers.forEach(b => reporter.onBrowserStart(b))

      expect(globalCoverageMapGetStub).not.to.have.been.called
    })

    it('should default to not including all sources', () => {
      const customConfig = helper.merge({}, rootConfig, {
        coverageReporter: {
          dir: 'defaultdir'
        }
      })

      globalCoverageMapGetStub.resetHistory()

      reporter = new m.CoverageReporter(customConfig, mockHelper, mockLogger)
      reporter.onRunStart()
      browsers.forEach(b => reporter.onBrowserStart(b))

      expect(globalCoverageMapGetStub).not.to.have.been.called
    })

    it('should pass watermarks to istanbul', async () => {
      const watermarks = {
        statements: [10, 20],
        branches: [30, 40],
        functions: [50, 60],
        lines: [70, 80]
      }

      const customConfig = helper.merge({}, rootConfig, {
        coverageReporter: {
          reporters: [
            {
              dir: 'reporter1'
            }
          ],
          watermarks: watermarks
        }
      })

      reportCreateStub.resetHistory()
      createContextStub.resetHistory()

      reporter = new m.CoverageReporter(customConfig, mockHelper, mockLogger)
      reporter.onRunStart()
      browsers.forEach(b => reporter.onBrowserStart(b))
      await reporter.onRunComplete(browsers)

      expect(createContextStub).to.have.been.called
      expect(reportCreateStub).to.have.been.called
      const options = reportCreateStub.getCall(0)
      expect(options.args[1].watermarks).to.deep.equal(watermarks)
    })

    it('should merge with istanbul default watermarks', async () => {
      const watermarks = {
        statements: [10, 20],
        lines: [70, 80]
      }

      const customConfig = helper.merge({}, rootConfig, {
        coverageReporter: {
          reporters: [
            {
              dir: 'reporter1'
            }
          ],
          watermarks: watermarks
        }
      })

      reportCreateStub.resetHistory()
      createContextStub.resetHistory()

      reporter = new m.CoverageReporter(customConfig, mockHelper, mockLogger)
      reporter.onRunStart()
      browsers.forEach(b => reporter.onBrowserStart(b))
      await reporter.onRunComplete(browsers)

      expect(createContextStub).to.have.been.called
      expect(reportCreateStub).to.have.been.called
      const options = reportCreateStub.getCall(0)
      expect(options.args[1].watermarks.statements).to.deep.equal(watermarks.statements)
      expect(options.args[1].watermarks.branches).to.deep.equal(mockDefaultWatermarks.branches)
      expect(options.args[1].watermarks.functions).to.deep.equal(mockDefaultWatermarks.functions)
      expect(options.args[1].watermarks.lines).to.deep.equal(watermarks.lines)
    })

    it('should log errors on low coverage and fail the build', async () => {
      const customConfig = helper.merge({}, rootConfig, {
        coverageReporter: {
          check: {
            each: {
              statements: 50
            }
          }
        }
      })

      mockCoverageMap.files.returns(['./foo/bar.js', './foo/baz.js'])
      mockCoverageSummary.toJSON.returns({
        lines: { total: 5, covered: 1, skipped: 0, pct: 20 },
        statements: { total: 5, covered: 1, skipped: 0, pct: 20 },
        functions: { total: 5, covered: 1, skipped: 0, pct: 20 },
        branches: { total: 5, covered: 1, skipped: 0, pct: 20 }
      })

      const spy1 = sinon.spy()

      const customLogger = {
        create: (name) => {
          return {
            debug () {},
            info () {},
            warn () {},
            error: spy1
          }
        }
      }

      const results = { exitCode: 0 }

      reporter = new m.CoverageReporter(customConfig, mockHelper, customLogger)
      reporter.onRunStart()
      browsers.forEach(b => reporter.onBrowserStart(b))
      reporter.onRunComplete(browsers, results)

      const done = sinon.stub()
      await reporter.onExit(done)

      expect(spy1).to.have.been.called
      expect(done.calledOnceWith(1)).to.be.true
    })

    it('should not log errors on sufficient coverage and not fail the build', async () => {
      const customConfig = helper.merge({}, rootConfig, {
        coverageReporter: {
          check: {
            each: {
              statements: 10
            }
          }
        }
      })

      mockCoverageMap.files.returns(['./foo/bar.js', './foo/baz.js'])
      mockCoverageSummary.toJSON.returns({
        lines: { total: 5, covered: 1, skipped: 0, pct: 20 },
        statements: { total: 5, covered: 1, skipped: 0, pct: 20 },
        functions: { total: 5, covered: 1, skipped: 0, pct: 20 },
        branches: { total: 5, covered: 1, skipped: 0, pct: 20 }
      })

      const spy1 = sinon.spy()

      const customLogger = {
        create: (name) => {
          return {
            debug () {},
            info () {},
            warn () {},
            error: spy1
          }
        }
      }

      const results = { exitCode: 0 }

      reporter = new m.CoverageReporter(customConfig, mockHelper, customLogger)
      reporter.onRunStart()
      browsers.forEach(b => reporter.onBrowserStart(b))
      await reporter.onRunComplete(browsers, results)

      expect(spy1).to.not.have.been.called

      expect(results.exitCode).to.equal(0)
    })

    it('Should log warnings on low coverage and not fail the build', async () => {
      const customConfig = helper.merge({}, rootConfig, {
        coverageReporter: {
          check: {
            emitWarning: true,
            each: {
              statements: 50
            }
          }
        }
      })

      mockCoverageMap.files.returns(['./foo/bar.js', './foo/baz.js'])
      mockCoverageSummary.toJSON.returns({
        lines: { total: 5, covered: 1, skipped: 0, pct: 20 },
        statements: { total: 5, covered: 1, skipped: 0, pct: 20 },
        functions: { total: 5, covered: 1, skipped: 0, pct: 20 },
        branches: { total: 5, covered: 1, skipped: 0, pct: 20 }
      })

      const log = {
        debug () {},
        info () {},
        warn: sinon.stub(),
        error: sinon.stub()
      }

      const customLogger = {
        create: (name) => {
          return log
        }
      }

      const results = { exitCode: 0 }

      reporter = new m.CoverageReporter(customConfig, mockHelper, customLogger)
      reporter.onRunStart()
      browsers.forEach(b => reporter.onBrowserStart(b))
      reporter.onRunComplete(browsers, results)

      const done = sinon.stub()
      await reporter.onExit(done)

      expect(log.error).to.not.have.been.called
      expect(log.warn).to.have.been.called
      expect(done.calledOnce).to.be.true
    })
  })
})
