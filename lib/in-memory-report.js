
function InMemoryReport (opt) {
  this.browser = opt.browser
  this.emitter = opt.emitter
}

InMemoryReport.prototype.writeReport = function (collector, sync) {
  this.emitter.emit('coverage_complete', this.browser, collector.getFinalCoverage())
}

InMemoryReport.TYPE = 'in-memory'

module.exports = InMemoryReport
