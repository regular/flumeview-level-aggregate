//jshint esversion:11
//jshint -W033
const test = require('tape')
const pull = require('pull-stream')
const Stream = require('./stream')

test('aggregates values', t=>{
  pull(
    pull.values([1,2,10,11,20,25]),
    (function () {
      let seq = 0
      return pull.map(v=>{
        return {seq: seq++, v} 
      })}
    )(),
    Stream(fitsBucket, add),
    pull.collect( (err, data)=>{
      t.deepEqual(data, [
        { seq: 1, sum: 3, id: 0, l: [ 1, 2 ] },
        { seq: 3, sum: 21, id: 1, l: [ 10, 11 ] },
        { seq: 5, sum: 45, id: 2, l: [ 20, 25 ] }
      ])
      t.end()
    })
  )
})

test('filtered values change bucket seq', t=>{
  pull(
    pull.values([1,2,10,11,20,25]),
    (function () {
      let seq = 0
      return pull.map(v=>{
        return {seq: seq++, v} 
      })}
    )(),
    Stream(fitsBucket, add, {filter: ({seq, v})=>v%2==0}),
    pull.collect( (err, data)=>{
      t.deepEqual(data, [
        { seq: 1, sum: 2, id: 0, l: [ 2 ] },
        { seq: 3, sum: 10, id: 1, l: [ 10 ] },
        { seq: 5, sum: 20, id: 2, l: [ 20 ] }
      ])
      t.end()
    })
  )
})

test('since changes bucket seq', t=>{
  pull(
    pull.values([
      {seq:0, v:1},
      {since: 100}
    ]),
    Stream(fitsBucket, add),
    pull.collect( (err, data)=>{
      t.deepEqual(data, [
        { seq: 100, sum: 1, id: 0, l: [ 1 ] }
      ])
      t.end()
    })
  )
})

test('since without bucket emits seq', t=>{
  pull(
    pull.values([
      {since: 100},
      {seq:101, v:1},
    ]),
    Stream(fitsBucket, add),
    pull.collect( (err, data)=>{
      t.deepEqual(data, [
        { seq: 100 , keys: []},
        { seq: 101, sum: 1, id: 0, l: [ 1 ] }
      ])
      t.end()
    })
  )
})


// - - - -

function bucket(n) {
  return (n / 10) << 0
}

function add(b, {seq, v}) {
  b = b || {seq, id: bucket(v), l: [], sum: 0}
  b.sum += v
  b.l = b.l.concat([v])
  b.seq = seq
  return b
}

function fitsBucket(b, {seq, v}) {
  return bucket(v) == b.id
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

