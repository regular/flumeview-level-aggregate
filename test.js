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

test('basic', t=>{
  const log = Log()
  log.filename = join(tmp.dirSync({unsafeCleanup: true}).name, 'xxx')
  const db = Flume(log)
  db.use('agg', Aggregate(1, fits, add, {timeout: 100}))

  function fits() {return true}
  function add(b, item) {
    return {key: 'baz', value: item}
  }

  db.append([
    { foo: 'bar' }
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
          { key: 'baz',  value: { foo: 'bar' } },
        ])
        db.close( err=>{
          t.notOk(err, 'db.close() should not error')
          t.end()
        })
      })
    )
  })
})

