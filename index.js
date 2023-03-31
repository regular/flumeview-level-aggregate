// jshint esversion: 6
// jshint -W033
/*
 * it uses flumeview-transfrom to transform database rows into a stream of rows to be
 * inserted into level db
 *
 * If it only emits a value once a bucekt is done (i.e. a value comes in that does not fit the current bucket anymore), we will encounter a situation where reading the index stalls. (flumedb waiting for the view to catch up, but it never does)
 *
 * If instead we write incomplete buckets to the db, we have a more complicated scenario when resuming the indexing after a restart. We then need to initialize the accumulator with the old value. 
 * And: in this scenario, downstream needs to be prepared for receiving more than one row per bucket.
 *
 */

const pull = require('pull-stream')
const FlumeTransform = require('flumeview-level-transform')
const ViewDriver = require('flumedb-view-driver')
const Stream = require('./stream')
const debug = require('debug')('flumeview-level-aggerage')

module.exports = function(flume, version, transform) {
  const views = []
  const createView = FlumeTransform(version, transform)
  const ret = function(log, name) {
    const view = createView(log, name)
    const use = ViewDriver(flume, log, source(view))
    views.forEach( ({name, create})=>{
      ret[name] = use(name, create)
    })
    return view
  }
  ret.use = function(name, create) {
    views.push({name, create})
    return ret
  }
  return ret

  function source(parent) {
    return function source(sv, opts) {
      debug(`source opts for ${sv.name}`, opts)

      return pull(
        parent.read(Object.assign({}, opts, {
          gt: [opts.gt, undefined],
          live: true,
          keys: true,
          values: false,
          sync: false,
          upto: true
        })),
        pull.map(x=>{
          if (x.key.length==1 && x.key[0] == undefined) {
            return {since: x.seq.since}
          }
          return x
        })
      )
    }
  }
}
