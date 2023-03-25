const test = require('tape')
const pull = require('pull-stream')
const Stream = require('./stream')

test('aggregates values', t=>{

  function bucket(n) {
    return (n / 10) << 0
  }

  function add(b, value) {
    b = b || {id: bucket(value), l: [], sum: 0}
    b.sum += value
    b.l.push(value)
    return b
  }

  // empty buckets fit all
  function fitsBucket(b,i) {
    return bucket(i) == b.id
  }

  pull(
    pull.values([1,2,10,11,20,25]),
    Stream(fitsBucket, add),
    pull.collect( (err, data)=>{
      console.log(data)
      t.deepEqual(data, [
        { sum: 3, id: 0, l: [ 1, 2 ] },
        { sum: 21, id: 1, l: [ 10, 11 ] },
        { sum: 45, id: 2, l: [ 20, 25 ] }
      ])
      t.end()
    })
  )
})
