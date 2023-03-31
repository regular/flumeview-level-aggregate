//jshint -W033
//jshint -W018
//jshint  esversion: 11
const pull = require('pull-stream')

module.exports = function(fitsBucket, add, timeout) {
  let end, timer, bucket, reading
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
            done(null, {
              keys: [],
              seq: data.since
            })
            return
          }

          if (!bucket || fitsBucket(bucket, data)) {
            bucket = add(bucket, data)
            slurp()
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
