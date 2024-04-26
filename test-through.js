//jshint esversion:11
//jshint -W033
const test = require('tape')
const pull = require('pull-stream')
const Stream = require('./through')

test('aggregates values', t=>{
  let seq = 0
  pull(
    pull.values([1,2,10,11,20,25]),
    pull.map(value=>{return {value, seq: seq++}}),
    Stream(fitsBucket, add),
    pull.collect( (err, data)=>{
      t.deepEqual(data, [
        {seq: 1, key: 0, value: { sum: 3, l: [ 1, 2 ] }},
        {seq: 3, key: 1, value: { sum: 21, l: [ 10, 11 ] }},
        {seq: 5, key: 2, value: { sum: 45, l: [ 20, 25 ] }}
      ])
      t.end()
    })
  )
})

test('filter', t=>{
  let seq = 0
  pull(
    pull.values([1,2,4, 10,11,12, 20,22,25]),
    pull.map(value=>{return {value, seq: seq++}}),
    Stream(fitsBucket, add, {filter: n=>n%2==0}),
    pull.collect( (err, data)=>{
      t.deepEqual(data, [
        {key: 0, seq: 2, value: { sum: 6, l: [ 2, 4 ] }},
        {key: 1, seq: 5, value: { sum: 22, l: [ 10, 12 ] }},
        {key: 2, seq: 8, value: { sum: 42, l: [ 20, 22 ] }}
      ])
      t.end()
    })
  )
})

test('initial', t=>{
  pull(
    pull.values([{seq: 1, value: 10}]),
    Stream(fitsBucket, add, {
      initial: {
        key: 1, seq: 0, value: { l:[], sum: 100}
      }
    }),
    pull.collect( (err, data)=>{
      t.deepEqual(data, [
        { key: 1, seq: 1, value: { sum: 110, l: [ 10 ] }}
      ])
      t.end()
    })
  )
})

test('initial, then end', t=>{
  pull(
    pull.values([]),
    Stream(fitsBucket, add, {
      initial: {
        key: 1, seq: 100, value: { l:[], sum: 100}
      }
    }),
    pull.collect( (err, data)=>{
      t.deepEqual(data, [
        { key: 1, seq: 100, value: { sum: 100, l: [] }}
      ])
      t.end()
    })
  )
})

test('dont stall', t=>{
  let seq = 0
  pull(
    timedSource([
      [0, 1],
      [0, 2],
      [200, 3],
      [0, 10],
      [0, 11],
      [0, 20],
      [200, 25],
    ]),
    pull.map(value=>{return {value, seq: seq++}}),
    Stream(fitsBucket, add, {timeout: 100}),
    pull.collect( (err, data)=>{
      t.deepEqual(data, [
        {key: 0, seq: 1, value: { sum: 3, l: [ 1, 2 ] }},
        {key: 0, seq: 2, value: { sum: 6, l: [ 1, 2, 3 ] }},
        {key: 1, seq: 4, value: { sum: 21, l: [ 10, 11 ] }},
        {key: 2, seq: 5, value: { sum: 20, l: [ 20 ] }},
        {key: 2, seq: 6, value: { sum: 45, l: [ 20, 25 ] }}
      ])
      t.end()
    })
  )
})

test('dont stall if last item is filtered', t=>{
  let seq = 0
  pull(
    timedSource([
      [0, 1],
      [0, 2],
      [1000, 3],
      [1000, 3]
    ]),
    pull.map(value=>{return {value, seq: seq++}}),
    Stream(fitsBucket, add, {timeout: 100, filter: n=>n != 3}),
    pull.through(console.log),
    pull.collect( (err, data)=>{
      t.deepEqual(data, [
        {key: 0, seq: 1, value: { sum: 3, l: [ 1, 2 ] }},
        {key: 0, seq: 2, value: { sum: 3, l: [ 1, 2 ] }},
        {key: 0, seq: 3, value: { sum: 3, l: [ 1, 2 ] }},
      ])
      t.end()
    })
  )
})

test('max_age', t=>{
  let seq = 0
  pull(
    pull.values([1,2,4, 10,11,12]),
    pull.map(value=>{return {value, seq: seq++}}),
    Stream(fitsBucket, add, {max_age: 2}),
    pull.collect( (err, data)=>{
      t.deepEqual(data, [
        {key: 0, seq: 1, value: { sum: 3, l: [ 1, 2 ] }},
        {key: 0, seq: 2, value: { sum: 7, l: [ 1, 2, 4 ] }},
        {key: 1, seq: 4, value: { sum: 21, l: [ 10, 11 ] }},
        {key: 1, seq: 5, value: { sum: 33, l: [ 10, 11, 12 ] }}
      ])
      t.end()
    })
  )
})


// - - - -

function bucketKey(n) {
  return (n / 10) << 0
}

function add(b, n) {
  b = b || {
    key: bucketKey(n),
    value: {
      l: [], sum: 0
    }
  }
  b.value.sum += n
  b.value.l = b.value.l.concat([n])
  return b
}

function fitsBucket({key, value}, n) {
  return bucketKey(n) == key
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

