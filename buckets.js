//jshint -W033
//jshint -W018
//jshint  esversion: 11
const pull = require('pull-stream')
const buckets = require('pull-buckets')

module.exports = function(fitsBucket, add, opts) {
  opts = opts || {}
  const filter = opts.filter || (x=>true)

  return pull(
    pull.through(kvs=>{
      if (!filter(kvs.value)) kvs.__ignore = true
    }),
    buckets( (bucket, kvs)=>{
      if (kvs.__ignore) return true
      return fitsBucket(bucket, kvs.value)
    }, (bucket, kvs) => {
      if (!kvs.__ignore) {
        bucket = add(bucket, kvs.value)
      } else delete kvs.__ignore
      if (bucket) {
        bucket.seq = kvs.seq
      }
      return bucket
    },
    opts)
  )
}

