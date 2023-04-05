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

test('close', t=>{
  const log = Log()
  log.filename = join(tmp.dirSync({unsafeCleanup: true}).name, 'xxx')
  const db = Flume(log)
  const v = Aggregate(db, 1, transform)

  function transform() {
    return pull(
      pull.map(x=>{
        const ret = {
          value: x.value,
          keys: ['baz'],
          seq: x.seq
        }
        console.log('parent: ', ret)
        return ret
      })
    )
  }

  v.use('myview', create)
  db.use('parent', v)

  function create(_log, name) {
    t.plan(6)
    t.equal(name, 'myview', 'name is passed to create')
//    t.equal(_log, log, 'log is passed to create')
    const since = Obv()

    return {
      methods: {
        //get: 'async',
        //read: 'source' 
      },
      since,
      createSink,
      close,
      destroy
    }

    function createSink() {
      since.set(-1)
      return pull(
        pull.through(x=>{
          console.log('SINK', x)
        }),
        pull.collect(err=>{
          console.log('SINK END', err)
        })
      )
    }

    function close(cb) {
      t.pass('close was called')
      cb(null)
    }

    function destroy(cb) {
      since.set(-1)
      close(cb)
    }
  }

  db.append([
    { foo: 'bar' }
  ], (err, seq) => {
    t.notOk(err, 'write items to db')
    pull(
      db.parent.read({
        keys: true,
        values: false,
        upto: true
      }),
      pull.collect( (err, items)=>{
        t.notOk(err, 'read parentView')
        t.deepEqual(items, [
          { key: 'baz', seq: { foo: 'bar' } },
          { key: [ undefined ], seq: { since: 0 } }
        ])
        db.close( err=>{
          t.notOk(err, 'db.close() should not error')
        })
      })
    )
  })
})

