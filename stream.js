//jshint -W033
//jshint -W018
//jshint  esversion: 11
const pull = require('pull-stream')

module.exports = function(fitsBucket, add, opts) {
  opts = opts || {}
  let {timeout, initial, filter} = opts
  filter = filter || (x=>true)

  let end, timer, bucket = initial, reading
  const cbs = []
  const buff = []

  return function (read) {

    return function (abort, cb) {
      cbs.push(cb)

      if (buff.length) {
        cb = cbs.shift()
        const [err, acc] = buff.shift()
        cb(err, acc)
        return
      }
      if (end) return done(end)
      if (reading) return

      function done(err, acc) {
        buff.push([err, acc])
        cb = cbs.shift()
        if (cb) {
          if (timer) clearTimeout(timer)
          timer = null
          const [err, acc] = buff.shift()
          cb(err, acc)
        }
      }

      function setTimer() {
        if (timer) clearTimeout(timer)
        if (!timeout) return
        timer = setTimeout(()=>{
          timer = null
          if (bucket !== null && bucket !== undefined) {
            done(null, bucket)
          }
        }, timeout)
      }

      setTimer()

      function slurp() {
        reading = true
        read(abort, (err, data) =>{
          reading = false
          if (err) {
            end = err
            if (bucket) done(null, bucket)
            else done(err)
            return
          }

          if (data.since !== undefined) {
            if (bucket) {
              bucket.seq = data.since
              return slurp()
            }
            return done(null, {
              keys: [],
              seq: data.since
            })
          }

          if (!filter(data)) {
            if (bucket && data.seq) {
              bucket.seq = data.seq
            }
            return slurp()
          }

          if (!bucket || fitsBucket(bucket, data)) {
            bucket = add(bucket, data)
            return slurp()
          } else {
            done(null, bucket)
            bucket = add(undefined, data)
          }
        })
      }
      slurp()
    }
  }
}
