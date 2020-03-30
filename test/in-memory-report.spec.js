const InMemoryReport = require('../lib/in-memory-report')

describe('InMemoryReport', () => {
  const emitter = { emit: sinon.stub() }
  const browser = { name: 'firefox' }
  const result = { test: { data: 'result' } }
  const fc = {
    path: 'test',
    toJSON: sinon.stub().returns({ data: 'result' })
  }
  const node = { getFileCoverage: sinon.stub().returns(fc) }

  it('should raise an "coverage_complete" event.', () => {
    const sut = new InMemoryReport({ browser, emitter })
    sut.onStart()
    sut.onDetail(node)
    sut.onEnd()
    expect(node.getFileCoverage).to.have.been.called
    expect(fc.toJSON).to.have.been.called
    expect(emitter.emit).to.have.been.calledWith('coverage_complete', browser, result)
  })

  it('should be of type "in-memory"', () =>
    expect(InMemoryReport.TYPE).to.be.equal('in-memory')
  )

  it('should not fail when created without arguments', () =>
    expect(new InMemoryReport()).to.be.ok
  )
})
