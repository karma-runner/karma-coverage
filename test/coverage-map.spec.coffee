coverageMap = require '../lib/coverage-map'
coverageObj = { path: './path.js', otherThings: 'that are in instrumented code' }

describe 'coverageMap', ->
  it 'should add coverageMap and get them', ->
    coverageMap.add(coverageObj)

    expect(coverageMap.get()['./path.js']).to.equal coverageObj

  it 'should be able to be reset', ->
    coverageMap.reset()

    expect(coverageMap.get()['./path.js']).to.not.exist

    coverageMap.add(coverageObj)

    expect(coverageMap.get()['./path.js']).to.equal coverageObj

    coverageMap.reset()

    expect(coverageMap.get()['./path.js']).to.not.exist

  it 'should be able to have multiple coverageMap', ->
    coverageMap.reset()
    coverageMap.add(coverageObj)
    coverageMap.add({ path: './anotherFile.js', moarKeys: [1, 2, 3] })

    expect(Object.keys(coverageMap.get()).length).to.equal 2
