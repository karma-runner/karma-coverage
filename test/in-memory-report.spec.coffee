InMemoryReport = require '../lib/in-memory-report'

describe 'InMemoryReport', ->  

  emitter = 
    emit: sinon.stub()
  browser = { name: 'firefox' }
  result = { test: { data: 'result' } }
  fc = {
    path: 'test'
    toJSON: sinon.stub().returns { data: 'result' }
  }
  node = getFileCoverage: sinon.stub().returns fc
  
  it 'should raise an "coverage_complete" event.', ->
    sut = new InMemoryReport { browser: browser, emitter: emitter}
    sut.onStart()
    sut.onDetail(node)
    sut.onEnd()
    expect(node.getFileCoverage).to.have.been.called
    expect(fc.toJSON).to.have.been.called
    expect(emitter.emit).to.have.been.calledWith('coverage_complete', browser, result)
    
  it 'should be of type "in-memory"', ->
    expect(InMemoryReport.TYPE).to.be.equal('in-memory')

  it 'should not fail when created without arguments', ->
    expect(new InMemoryReport()).to.be.ok
