index = require '../lib/index'
InMemoryReport = require '../lib/in-memory-report'
reportCreator = require '../lib/report-creator'

describe 'Index', ->  
  it 'should register "InMemoryReport" to Report Creator', ->
    expect(reportCreator.create('in-memory', {})).to.be.an.instanceof(InMemoryReport)