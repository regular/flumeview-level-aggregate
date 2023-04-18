//jshint esversion:11, -W033
const test = require('tape')
const pull = require('pull-stream')
const am = require('./assert-monotonic')

test('monotonic stream up', t=>{
  t.plan(1)
  pull(
    pull.values([1,undefined,2,2,3,5]),
    am(x=>x, t.name, msg=>{
      console.error(msg)
      t.error('got nessage')
    }),
    pull.onEnd( err=>{
      t.notOk(err, 'does not error')
    })
  )
})

test('monotonic stream down', t=>{
  t.plan(1)
  pull(
    pull.values([7,7,7,4,2,1,undefined,-10]),
    am(x=>x, t.name, msg=>{
      console.error(msg)
      t.error('got nessage')
    }),
    pull.onEnd( err=>{
      t.notOk(err, 'does not error')
    })
  )
})

test('non-monotonic stream', t=>{
  t.plan(2)
  pull(
    pull.values([7,1,2]),
    am(x=>x, t.name, msg=>{
      console.error(msg)
      t.pass('got message')
    }),
    pull.onEnd( err=>{
      t.notOk(err, 'does not error')
    })
  )
})
