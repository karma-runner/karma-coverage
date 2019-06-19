istanbulLibSourceMaps = require 'istanbul-lib-source-maps'

globalSourceMapStore = require '../lib/source-map-store'

describe 'Source Map Store', ->

  it 'should create a source map store for path if it did not exist previously', ->
    createSourceMapStoreStub = sinon.stub(istanbulLibSourceMaps, 'createSourceMapStore')
    createSourceMapStoreStub.returns({})

    globalSourceMapStore.get('__test', { opts: 'test' })
    expect(createSourceMapStoreStub).to.be.calledWith({ opts: 'test' })

  it 'should not create a source map store for path if it previously was called', ->
    createSourceMapStoreStub = sinon.stub(istanbulLibSourceMaps, 'createSourceMapStore')
    createSourceMapStoreStub.returns({})

    globalSourceMapStore.get('__test2', { opts: 'test2' })
    globalSourceMapStore.get('__test2', { opts: 'test3' })

    expect(createSourceMapStoreStub.callCount).to.be.equal(1)
    expect(createSourceMapStoreStub).to.be.calledWith({ opts: 'test2' })
