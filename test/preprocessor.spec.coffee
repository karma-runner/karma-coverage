vm = require 'vm'
util = require 'util'
path = require 'path'

helper = {_: require 'lodash'}
coverageMap = require '../lib/coverage-map'

describe 'preprocessor', ->
  createPreprocessor = require '../lib/preprocessor'

  ORIGINAL_CODE = '''
  if (a) {
    something();
  } else {
    other();
  }
  '''

  ORIGINAL_COFFEE_CODE = '''
  if a
    something()
  else
    other()
  '''

  mockLogger = create: ->
    error: -> throw new Error(util.format.apply util, arguments)
    warn: -> null
    info: -> null
    debug: -> null

  # TODO(vojta): refactor this somehow ;-) it's copy pasted from lib/file-list.js
  File = (path, mtime) ->
    @path = path
    @originalPath = path
    @contentPath = path
    @mtime = mtime
    @isUrl = false


  it 'should not do anything if coverage reporter is not used', (done) ->
    process = createPreprocessor mockLogger, helper, null, ['dots', 'progress'], {}
    file = new File '/base/path/file.js'

    process ORIGINAL_CODE, file, (preprocessedCode) ->
      expect(preprocessedCode).to.equal ORIGINAL_CODE
      expect(file.path).to.equal '/base/path/file.js'
      done()


  it 'should preprocess the code', (done) ->
    process = createPreprocessor mockLogger, helper, '/base/path', ['coverage', 'progress'], {}
    file = new File '/base/path/file.js'

    process ORIGINAL_CODE, file, (preprocessedCode) ->
      sandbox =
        a: true
        something: ->

      vm.runInNewContext preprocessedCode, sandbox
      expect(sandbox.__coverage__).to.have.ownProperty path.resolve('/base/path/file.js')
      done()

  it 'should preprocess the fake code', (done) ->
    fakeInstanbulLikeInstrumenter  = ->
    fakeInstanbulLikeInstrumenter::instrument = (_a, _b, callback) ->
      callback()
      return
    process = createPreprocessor mockLogger, helper, '/base/path', ['coverage', 'progress'],
      instrumenters:
       fakeInstanbulLike :
          Instrumenter : fakeInstanbulLikeInstrumenter
      instrumenter:
        '**/*.fake': 'fakeInstanbulLike'
    file = new File '/base/path/file.fake'

    process ORIGINAL_COFFEE_CODE, file, (preprocessedCode) ->
      sandbox =
        a: true
        something: ->

      vm.runInNewContext preprocessedCode, sandbox
      expect(file.path).to.equal '/base/path/file.fake'
      done()

  it 'should preprocess the fake code with the config options', (done) ->
    fakeInstanbulLikeInstrumenter = (options) ->
      expect(options.experimental).to.be.ok
      return
    fakeInstanbulLikeInstrumenter::instrument = (_a, _b, callback) ->
      callback()
      return

    process = createPreprocessor mockLogger, helper, '/base/path', ['coverage', 'progress'],
      instrumenters:
        fakeInstanbulLike:
          Instrumenter: fakeInstanbulLikeInstrumenter
      instrumenterOptions:
        fakeInstanbulLike:
          experimental: yes
      instrumenter:
        '**/*.fake': 'fakeInstanbulLike'

    file = new File '/base/path/file.fake'

    process ORIGINAL_COFFEE_CODE, file, done

  it 'should not preprocess the coffee code', (done) ->
    process = createPreprocessor mockLogger, helper, '/base/path', ['coverage', 'progress'],
      instrumenter:
        '**/*.coffee': 'istanbul'
    file = new File '/base/path/file.coffee'

    process ORIGINAL_CODE, file, (preprocessedCode) ->
      sandbox =
        a: true
        something: ->

      vm.runInNewContext preprocessedCode, sandbox
      expect(file.path).to.equal '/base/path/file.coffee'
      expect(sandbox.__coverage__).to.have.ownProperty path.resolve('/base/path/file.coffee')
      done()

  it 'should fail if invalid instrumenter provided', (done) ->
    work = ->
      createPreprocessor mockLogger, helper, '/base/path', ['coverage', 'progress'],
        instrumenter:
          '**/*.coffee': 'madeup'
    expect(work).to.throw()
    done()

  it 'should add coverageMap when including all sources', (done) ->
    process = createPreprocessor mockLogger, helper, '/base/path', ['coverage'], { includeAllSources: true }
    file = new File '/base/path/file.js'

    coverageMap.reset()

    process ORIGINAL_CODE, file, (preprocessedCode) ->
      expect(coverageMap.get()[path.resolve('/base/path/file.js')]).to.exist
      done()

  it 'should not add coverageMap when not including all sources', (done) ->
    process = createPreprocessor mockLogger, helper, '/base/path', ['coverage'], { includeAllSources: false }
    file = new File '/base/path/file.js'

    coverageMap.reset()

    process ORIGINAL_CODE, file, (preprocessedCode) ->
      expect(coverageMap.get()['./file.js']).to.not.exist
      done()

  it 'should not add coverageMap in the default state', (done) ->
    process = createPreprocessor mockLogger, helper, '/base/path', ['coverage'], {}
    file = new File '/base/path/file.js'

    coverageMap.reset()

    process ORIGINAL_CODE, file, (preprocessedCode) ->
      expect(coverageMap.get()['./file.js']).to.not.exist
      done()

  it 'should change extension of CoffeeScript files when given `useJSExtensionForCoffeeScript`', (done) ->

    ibrikInstrumenter  = ->
    ibrikInstrumenter::instrument = (_a, _b, callback) ->
      callback()
      return

    process = createPreprocessor mockLogger, helper, '/base/path', ['coverage', 'progress'],
      instrumenters:
        ibrik :
          Instrumenter : ibrikInstrumenter
      instrumenter:
        '**/*.coffee': 'ibrik'
      useJSExtensionForCoffeeScript: true

    file = new File '/base/path/file.coffee'

    process ORIGINAL_COFFEE_CODE, file, (preprocessedCode) ->
      sandbox =
        a: true
        something: ->

      vm.runInNewContext preprocessedCode, sandbox
      expect(file.path).to.equal '/base/path/file.js'
      done()
