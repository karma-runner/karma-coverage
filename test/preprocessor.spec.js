const vm = require('vm')
const util = require('util')
const path = require('path')

const coverageMap = require('../lib/coverage-map')

describe('preprocessor', () => {
  const createPreprocessor = require('../lib/preprocessor')

  const ORIGINAL_CODE = `
  if (a) {
    something();
  } else {
    other();
  }
  `

  const ORIGINAL_COFFEE_CODE = `
  if a
    something()
  else
    other()
  `

  const mockLogger = {create: () => {
    return {
      error: (...arg) => { throw new Error(util.format.apply(util, arg)) },
      warn: () => {},
      info: () => {},
      debug: () => {}
    }
  }}

  // TODO(vojta): refactor this somehow ;-) it's copy pasted from lib/file-list.js
  function File (path, mtime) {
    this.path = path
    this.originalPath = path
    this.contentPath = path
    this.mtime = mtime
    this.isUrl = false
  }

  it('should not do anything if coverage reporter is not used', (done) => {
    const process = createPreprocessor(mockLogger, null, ['dots', 'progress'], {})
    const file = new File('/base/path/file.js')

    process(ORIGINAL_CODE, file, (preprocessedCode) => {
      expect(preprocessedCode).to.equal(ORIGINAL_CODE)
      expect(file.path).to.equal('/base/path/file.js')
      done()
    })
  })

  it('should preprocess the code', (done) => {
    const process = createPreprocessor(mockLogger, '/base/path', ['coverage', 'progress'], {})
    const file = new File('/base/path/file.js')

    process(ORIGINAL_CODE, file, (preprocessedCode) => {
      const sandbox = {
        a: true,
        something: () => {}
      }

      vm.runInNewContext(preprocessedCode, sandbox)
      expect(sandbox.__coverage__).to.have.ownProperty(path.resolve('/base/path/file.js'))
      done()
    })
  })

  it('should preprocess the fake code', (done) => {
    class fakeInstanbulLikeInstrumenter {
      instrument (_a, _b, callback) {
        callback()
      }
      lastSourceMap () {}
    }
    const process = createPreprocessor(mockLogger, '/base/path', ['coverage', 'progress'], {
      instrumenters: {
        fakeInstanbulLike: {
          Instrumenter: fakeInstanbulLikeInstrumenter
        }
      },
      instrumenter: {
        '**/*.fake': 'fakeInstanbulLike'
      }
    })
    const file = new File('/base/path/file.fake')

    process(ORIGINAL_COFFEE_CODE, file, (preprocessedCode) => {
      const sandbox = {
        a: true,
        something: () => {}
      }

      vm.runInNewContext(preprocessedCode, sandbox)
      expect(file.path).to.equal('/base/path/file.fake')
      done()
    })
  })

  it('should preprocess the fake code with the config options', (done) => {
    class fakeInstanbulLikeInstrumenter {
      constructor (options) {
        expect(options.experimental).to.be.ok
      }
      instrument (_a, _b, callback) {
        callback()
      }
      lastSourceMap () {}
    }
    const process = createPreprocessor(mockLogger, '/base/path', ['coverage', 'progress'], {
      instrumenters: {
        fakeInstanbulLike: {
          Instrumenter: fakeInstanbulLikeInstrumenter
        }
      },
      instrumenterOptions: {
        fakeInstanbulLike: {
          experimental: 'yes'
        }
      },
      instrumenter: {
        '**/*.fake': 'fakeInstanbulLike'
      }
    })

    const file = new File('/base/path/file.fake')
    process(ORIGINAL_COFFEE_CODE, file, done)
  })

  it('should not preprocess the coffee code', (done) => {
    const process = createPreprocessor(mockLogger, '/base/path', ['coverage', 'progress'], {instrumenter: {'**/*.coffee': 'istanbul'}})
    const file = new File('/base/path/file.coffee')

    process(ORIGINAL_CODE, file, (preprocessedCode) => {
      const sandbox = {
        a: true,
        something: () => {}
      }

      vm.runInNewContext(preprocessedCode, sandbox)
      expect(file.path).to.equal('/base/path/file.coffee')
      expect(sandbox.__coverage__).to.have.ownProperty(path.resolve('/base/path/file.coffee'))
      done()
    })
  })

  it('should fail if invalid instrumenter provided', () => {
    const work = () => {
      createPreprocessor(mockLogger, '/base/path', ['coverage', 'progress'], {instrumenter: {'**/*.coffee': 'madeup'}})
    }
    expect(work).to.throw()
  })

  it('should add coverageMap when including all sources', (done) => {
    const process = createPreprocessor(mockLogger, '/base/path', ['coverage'], { includeAllSources: true })
    const file = new File('/base/path/file.js')

    coverageMap.reset()

    process(ORIGINAL_CODE, file, (preprocessedCode) => {
      expect(coverageMap.get()[path.resolve('/base/path/file.js')]).to.exist
      done()
    })
  })

  it('should not add coverageMap when not including all sources', (done) => {
    const process = createPreprocessor(mockLogger, '/base/path', ['coverage'], { includeAllSources: false })
    const file = new File('/base/path/file.js')

    coverageMap.reset()

    process(ORIGINAL_CODE, file, (preprocessedCode) => {
      expect(coverageMap.get()['./file.js']).to.not.exist
      done()
    })
  })

  it('should not add coverageMap in the default state', (done) => {
    const process = createPreprocessor(mockLogger, '/base/path', ['coverage'], {})
    const file = new File('/base/path/file.js')

    coverageMap.reset()

    process(ORIGINAL_CODE, file, (preprocessedCode) => {
      expect(coverageMap.get()['./file.js']).to.not.exist
      done()
    })
  })

  it('should change extension of CoffeeScript files when given `useJSExtensionForCoffeeScript`', (done) => {
    class ibrikInstrumenter {
      instrument (_a, _b, callback) {
        callback()
      }
      lastSourceMap () {}
    }

    const process = createPreprocessor(mockLogger, '/base/path', ['coverage', 'progress'], {
      instrumenters: {
        ibrik: {
          Instrumenter: ibrikInstrumenter
        }
      },
      instrumenter: {
        '**/*.coffee': 'ibrik'
      },
      useJSExtensionForCoffeeScript: true
    })

    const file = new File('/base/path/file.coffee')

    process(ORIGINAL_COFFEE_CODE, file, (preprocessedCode) => {
      const sandbox = {
        a: true,
        something: () => {}
      }

      vm.runInNewContext(preprocessedCode, sandbox)
      expect(file.path).to.equal('/base/path/file.js')
      done()
    })
  })
})
