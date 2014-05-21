vm = require 'vm'
util = require 'util'

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
    process = createPreprocessor mockLogger, null, ['dots', 'progress'], {}
    file = new File '/base/path/file.js'

    process ORIGINAL_CODE, file, (preprocessedCode) ->
      expect(preprocessedCode).to.equal ORIGINAL_CODE
      expect(file.path).to.equal '/base/path/file.js'
      done()


  it 'should preprocess the code', (done) ->
    process = createPreprocessor mockLogger, '/base/path', ['coverage', 'progress'], {}
    file = new File '/base/path/file.js'

    process ORIGINAL_CODE, file, (preprocessedCode) ->
      sandbox =
        a: true
        something: ->

      vm.runInNewContext preprocessedCode, sandbox
      expect(sandbox.__coverage__).to.have.ownProperty './file.js'
      done()

  it 'should preprocess the coffee code', (done) ->
    process = createPreprocessor mockLogger, '/base/path', ['coverage', 'progress'], {}
    file = new File '/base/path/file.coffee'

    process ORIGINAL_COFFEE_CODE, file, (preprocessedCode) ->
      sandbox =
        a: true
        something: ->

      vm.runInNewContext preprocessedCode, sandbox
      expect(file.path).to.equal '/base/path/file.js'
      expect(sandbox.__coverage__).to.have.ownProperty './file.coffee'
      done()

  it 'should not preprocess the coffee code', (done) ->
    process = createPreprocessor mockLogger, '/base/path', ['coverage', 'progress'],
      instrumenter:
        '**/*.coffee': 'istanbul'
    file = new File '/base/path/file.coffee'

    process ORIGINAL_CODE, file, (preprocessedCode) ->
      sandbox =
        a: true
        something: ->

      vm.runInNewContext preprocessedCode, sandbox
      expect(file.path).to.equal '/base/path/file.coffee'
      expect(sandbox.__coverage__).to.have.ownProperty './file.coffee'
      done()

  it 'should fail if invalid instrumenter provided', (done) ->
    work = ->
      createPreprocessor mockLogger, '/base/path', ['coverage', 'progress'],
        instrumenter:
          '**/*.coffee': 'madeup'
    expect(work).to.throw()
    done()
