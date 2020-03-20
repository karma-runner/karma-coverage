require('../lib/index')
const InMemoryReport = require('../lib/in-memory-report')
const reportCreator = require('../lib/report-creator')

describe('Index', () => {
  it('should register "InMemoryReport" to Report Creator', () =>
    expect(reportCreator.create('in-memory', {})).to.be.an.instanceof(InMemoryReport)
  )
})
