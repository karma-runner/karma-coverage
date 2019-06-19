function InMemoryReport (opt) {
  this.opt = opt
}

InMemoryReport.prototype.onStart = function (root, context) {
  this.data = {}
}

InMemoryReport.prototype.onDetail = function (node) {
  const fc = node.getFileCoverage()
  const key = fc.path
  this.data[key] = fc.toJSON()
}

InMemoryReport.prototype.onEnd = function () {
  if (!this.opt.emitter || !this.opt.emitter.emit) {
    console.error('Could not raise "coverage_complete" event, missing emitter because it was not supplied during initialization of the reporter')
  } else {
    this.opt.emitter.emit('coverage_complete', this.opt.browser, this.data)
  }
}

InMemoryReport.TYPE = 'in-memory'

module.exports = InMemoryReport
