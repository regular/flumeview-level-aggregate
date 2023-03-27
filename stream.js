//jshint -W033
//jshint -W018
//jshint  esversion: 11
const pull = require('pull-stream')
const win = require('pull-window')

module.exports = function(fitsBucket, add, timeout) {
  let bucket
  let startNew = true
  let timer

  return win(startf, mapf)

  function startf(data, cb) {
    console.log('>', data)
    if (!startNew) return 
    console.log('start window')
    startNew = false

    function setTimer() {
      console.log('setTimeout')
      if (timer) clearTimeout(timer)
      timer = setTimeout(()=>{
        timer = null
        console.log('XXXXXXXX timeout', bucket)
        //if (bucket !== null && bucket !== undefined) {
          done(null, bucket)
        //}
      }, timeout)
    }

    function done(err, acc) {
      console.log('done', acc)
      if (timer) clearTimeout(timer)
      timer = null
      startNew = true
      cb(err, acc)
    }


    return function(end, data) {
      if (end) return done(end, bucket)
      setTimer()

      if (!bucket || fitsBucket(bucket, data)) {
        bucket = add(bucket, data)
      } else {
        done(null, bucket)
        bucket = add(undefined, data)
      }
    }
  }

  function mapf(start, data) {
    return data
  }
}

function defaultAdd(acc, newvalues) {  
  acc = acc || []
  newvalues.forEach( v=>acc.push(v) )
}

