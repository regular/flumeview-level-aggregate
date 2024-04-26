//jshint -W033
//jshint -W018
//jshint  esversion: 11
const pull = require('pull-stream')
const copy = require('deep-copy')

module.exports = function(fitsBucket, add, opts) {
  opts = opts || {}
  let {timeout, initial, filter, max_age} = opts
  filter = filter || (x=>true)
  if (max_age == undefined) max_age = 512

  let end, timer, bucket = initial, reading
  let rec_cnt = 0
  let seq = initial && initial.seq
  if (seq == undefined) seq = -1
  const cbs = []
  const buff = []

  return function (read) {

    return function (abort, cb) {
      cbs.push(cb)

      if (buff.length) {
        cb = cbs.shift()
        const [err, acc, seq] = buff.shift()
        if (err) return cb(err)
        return cb(null, {key: acc && acc.key, value: acc && acc.value, seq})
      }
      if (end) return flush(end)
      if (reading) return

      function flush(err, acc) {
        buff.push([err, acc, seq])
        cb = cbs.shift()
        if (cb) {
          if (timer) clearTimeout(timer)
          timer = null
          const [err, acc, seq] = buff.shift()
          if (err) return cb(err)
          return cb(null, {key: acc && acc.key, value: acc && acc.value, seq})
        }
      }

      function setTimer() {
        if (timer) clearTimeout(timer)
        if (!timeout) return
        timer = setTimeout(()=>{
          timer = null
          if (bucket !== null && bucket !== undefined) {
            flush(null, copy(bucket))
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
            if (bucket) flush(null, bucket)
            else flush(err)
            return
          }

          if (!filter(data.value)) {
            seq = data.seq
            setTimer()
            return slurp()
          }

          if (!bucket || fitsBucket(bucket, data.value)) {
            seq = data.seq
            bucket = add(bucket, data.value)
            if (max_age && ++rec_cnt >= max_age) {
              rec_cnt = 0
              flush(null, copy(bucket))
            }
            return slurp()
          } else {
            flush(null, bucket)
            seq = data.seq
            bucket = add(undefined, data.value)
          }
        })
      }
      slurp()
    }
  }
}
