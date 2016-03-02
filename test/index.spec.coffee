index = require '../lib/index'
InMemoryReport = require '../lib/in-memory-report'
istanbul = require 'istanbul'

describe 'Index', ->  
  it 'should register "InMemoryReport" to istanbul', ->
    expect(istanbul.Report.create('in-memory', {})).to.be.an.instanceof(InMemoryReport)