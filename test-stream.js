//jshint esversion:11
//jshint -W033
const test = require('tape')
const pull = require('pull-stream')
const Stream = require('./stream')

test('aggregates values', t=>{
  pull(
    pull.values([1,2,10,11,20,25]),
    Stream(fitsBucket, add),
    pull.collect( (err, data)=>{
      t.deepEqual(data, [
        { sum: 3, id: 0, l: [ 1, 2 ] },
        { sum: 21, id: 1, l: [ 10, 11 ] },
        { sum: 45, id: 2, l: [ 20, 25 ] }
      ])
      t.end()
    })
  )
})

test('filter', t=>{
  pull(
    pull.values([1,2,4, 10,11,12, 20,22,25]),
    Stream(fitsBucket, add, {filter: n=>n%2==0}),
    pull.collect( (err, data)=>{
      t.deepEqual(data, [
        { sum: 6, id: 0, l: [ 2, 4 ] },
        { sum: 22, id: 1, l: [ 10, 12 ] },
        { sum: 42, id: 2, l: [ 20, 22 ] }
      ])
      t.end()
    })
  )

})

test('dont stall', t=>{
  pull(
    timedSource([
      [0, 1],
      [0, 2],
      [2000, 3],
      [0, 10],
      [0, 11],
      [0, 20],
      [2000, 25],
    ]),
    Stream(fitsBucket, add, {timeout: 100}),
    pull.through(console.log),
    pull.map(x=>Object.assign({}, x)),
    pull.collect( (err, data)=>{
      //console.log(data)
      t.deepEqual(data, [
        { sum: 3, id: 0, l: [ 1, 2 ] },
        { sum: 6, id: 0, l: [ 1, 2, 3 ] },
        { sum: 21, id: 1, l: [ 10, 11 ] },
        { sum: 20, id: 2, l: [ 20 ] },
        { sum: 45, id: 2, l: [ 20, 25 ] }
      ])
      t.end()
    })
  )
})


// - - - -

function bucket(n) {
  return (n / 10) << 0
}

function add(b, value) {
  b = b || {id: bucket(value), l: [], sum: 0}
  b.sum += value
  b.l = b.l.concat([value])
  return b
}

function fitsBucket(b,i) {
  return bucket(i) == b.id
}

function timedSource(data) {
  return pull(
    pull.values(data),
    pull.asyncMap(function(item, cb) {
      setTimeout(function() {
        cb(null, item[1])
      }, item[0]);
    })
  )
}

