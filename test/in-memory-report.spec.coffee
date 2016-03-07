InMemoryReport = require '../lib/in-memory-report'
istanbul = require 'istanbul';

describe 'InMemoryReport', ->  

  emitter = 
    emit: sinon.stub()
  browser = { name: 'firefox' }
  result = { coverage: 'result' }
  collector =
    getFinalCoverage: sinon.stub().returns result
  
  it 'should raise an "coverage_complete" event.', ->
    sut = new InMemoryReport { browser: browser, emitter: emitter}
    sut.writeReport collector
    expect(collector.getFinalCoverage).to.have.been.called
    expect(emitter.emit).to.have.been.calledWith('coverage_complete', browser, result)
    
  it 'should be of type "in-memory"', ->
    expect(InMemoryReport.TYPE).to.be.equal('in-memory')

  it 'should not fail when created without arguments', ->
    expect(new InMemoryReport()).to.be.ok
    
  it 'should inherit from Report', ->
    expect(new InMemoryReport()).to.be.an.instanceof(istanbul.Report)