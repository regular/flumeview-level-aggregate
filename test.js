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

test('resume', t=>{
  const log = Log()
  log.filename = join(tmp.dirSync({unsafeCleanup: true}).name, 'xxx')
  let db = Flume(log)
  db.use('agg', Aggregate(1, fitsBucket, add, {timeout: 100}))

  db.append([
    {n:1}
  ], (err, seq) => {
    t.notOk(err, 'write items to db')
    pull(
      db.agg.read({
        keys: true,
        values: true
      }),
      pull.collect( (err, items)=>{
        t.notOk(err, 'read view')
        t.deepEqual(items, [
          { key: 0,  value: {sum: 1, l: [1]} },
          //{ key: 1,  value: {sum: 10, l: [10]} },
        ])
        db.close( err=>{
          t.notOk(err, 'db.close() should not error')
          
          db = Flume(log)
          db.use('agg', Aggregate(1, fitsBucket, add, {timeout: 100}))

          db.append([
            {n:2},
            //{n:20}
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
                  //{ key: 1,  value: {sum: 21, l: [10, 11]} },
                  //{ key: 2,  value: {sum: 20, l: [20]} },
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

