//jshint esversion: 11
//jshint -W033
const pull = require('pull-stream')
const tmp = require('tmp')
const Log = require('flumelog-array')
const Flume = require('flumedb')
const {join} = require('path')
const Obv = require('obz')
const test = require('tape')

const Aggregate = require('.')

test('assert_monotonic', t=>{
  const log = Log()
  log.filename = join(tmp.dirSync({unsafeCleanup: true}).name, 'xxx')
  let db = Flume(log)
  db.use('agg', Aggregate(1, fitsBucket, add, {
    timeout: 100,
    assert_monotonic: x=>{
      return x.n
    }
  }))

  db.append([
    {n:1},
    {n:2},
    {n:0},
  ], (err, seq) => {
    t.notOk(err, 'write items to db')
    db.agg.since(x=>{
      if (x==2) t.end()
    })
  })
})


test('resume', t=>{
  const log = Log()
  log.filename = join(tmp.dirSync({unsafeCleanup: true}).name, 'xxx')
  let db = Flume(log)
  db.use('agg', Aggregate(1, fitsBucket, add, {timeout: 100}))

  db.agg.since( s=>{ console.log('since', s)})

  db.append([
    {n:1},
    {n:2},
    {n:10},
  ], (err, seq) => {
    t.notOk(err, 'write items to db')
    console.log('db seq:', seq)
    console.log('reading index')
    pull(
      db.agg.read({
        keys: true,
        values: true
      }),
      pull.through(console.log),
      pull.collect( (err, items)=>{
        t.notOk(err, 'read view')
        t.deepEqual(items, [
          { key: 0,  value: {sum: 3, l: [1, 2]} },
          { key: 1,  value: {sum: 10, l: [10]} },
        ])
        db.close( err=>{
          t.notOk(err, 'db.close() should not error')
          
          db = Flume(log)
          db.use('agg', Aggregate(1, fitsBucket, add, {timeout: 100}))

          db.agg.since(x=>{
            console.log(x)
          })

          db.append([
            {n: 11}, //This causes 'test exited without ending
          ], (err, seq) => {
            t.notOk(err, 'write items to db, again')
            pull(
              db.agg.read({
                keys: true,
                values: true
              }),
              pull.collect( (err, items)=>{
                t.notOk(err, 'read view again')
                t.deepEqual(items, [
                  { key: 0,  value: {sum: 3, l: [1, 2]} },
                  { key: 1,  value: {sum: 21, l: [10, 11]} },
                ])
                t.end()
              })
            )
          })
        })
      })
    )
  })
})

// - - - 

function bucketKey(n) {
  return (n / 10) << 0
}

function add(b, {n}) {
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

function fitsBucket({key, value}, {n}) {
  return bucketKey(n) == key
}

