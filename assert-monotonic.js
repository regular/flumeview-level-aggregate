//jshint esversion: 11, -W033

const pull = require('pull-stream')
const {inspect} = require('util')

module.exports = function(f, name, cb) {
  if (!f) return pull.through(x=>{}) 
  
  let last = null
  let sign = null

  return pull.through( (value)=>{
    const curr = f(value)
    if (curr == undefined) return
    if (last == null) {
      last = curr
      return
    }
    const delta = curr - last
    last = curr
    if (delta == 0) return
    const currSign = Math.sign(delta)
    if (sign == null) {
      sign = currSign
      return
    }
    if (currSign !== sign) {
      const msg = (`MONOTONIC ASSERTION ${name || '[unnamed]'} FAILED at value: ${inspect(value)}`)
      if (cb) cb(msg)
    }
  })
}

