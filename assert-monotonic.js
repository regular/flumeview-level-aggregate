//jshint esversion: 11, -W033

const pull = require('pull-stream')
const {inspect} = require('util')
const copy = require('deep-copy')

module.exports = function(f, name, cb) {
  if (!f) return pull.through(x=>{}) 
  
  let last = null
  let sign = null
  let prevValue = null

  return pull(
    pull.through( value=>{
      const curr = f(value)
      if (curr == undefined) return
      if (last == null) {
        last = curr
        return
      }
      const delta = curr - last
      const _last = last
      last = curr
      if (delta == 0) return
      const currSign = Math.sign(delta)
      if (sign == null) {
        sign = currSign
        return
      }
      if (currSign !== sign) {
        const msg = `MONOTONIC ASSERTION ${name || '[unnamed]'} FAILED (${_last} followed by ${curr}, delta = ${delta}, expected sign: ${sign}) at values:\nprev = ${inspect(prevValue)}\ncurr = ${inspect(value)}`
        if (cb) cb(msg)
      }
    }),
    pull.through( value=>{
      if (f(value) !== undefined) {
        prevValue = copy(value)
      }
    })
  )
}

