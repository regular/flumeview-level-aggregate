//jshint -W033
//jshint -W018
//jshint  esversion: 11
const pull = require('pull-stream')
const win = require('pull-window')

module.exports = function(fitsBucket, add) {
  let current = null
  let next = undefined

  return win(startf, mapf)

  function startf(data, cb) {
    if (current !== null) return 
    current = next

    return function(end, data) {
      if (end) return cb(end, current)

      if (!current || fitsBucket(current, data)) {
        current = add(current, data)
      } else {
        next = add(undefined, data)
        cb(null, current)
        current = null
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

