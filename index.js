//jshint  esversion: 11
//jshint -W033
//jshint -W014
const pull = require('pull-stream')
const Level = require('level')
const charwise = require('charwise')
const pl = require('pull-level')
const Obv = require('obz')
const path = require('path')
const ltgt = require('ltgt')
const multicb = require('multicb')

const through = require('./through')
const assertMono = require('./assert-monotonic')

const noop = () => {}
const META = '\x00'

module.exports = function(version, fits, add, opts) {
  return function (log, name) {
    const dir = path.dirname(log.filename)
    const since = Obv()
    let closed, outdated
    let initial

    let db = create()

    const done = multicb({pluck: 1, spread: true})

    pull(
      read({keys: true, values: true, reverse: true}),
      pull.take(1),
      pull.collect(done())
    )

    db.get(META, { keyEncoding: 'utf8' }, done())

    done(function (err, init, meta) {
      if (err) return since.set(-1)
      initial = init && init[0]
      initial.seq = meta.since
      if (meta.version === version) {
        since.set(meta.since)
      } else {
        // version has changed, wipe db and start over.
        outdated = true
        destroy()
      }
    })

    return {
      methods: { get: 'async', read: 'source' },
      since,
      createSink,
      get,
      read, 
      close,
      destroy
    }

    function createSink(cb) {
      let {assert_monotonic, filter} = opts
      if (!filter) filter = x=>true
      return pull(
        //pull.filter(item => item.sync == undefined),
        assert_monotonic ?
        assertMono( ({seq, value}) => {
          if (!filter(value)) return
          return assert_monotonic(value)
        }, name, msg=>{
          console.error(msg)
        }) : pull.through(),
        through(fits, add, Object.assign({}, opts, {initial})),
        pull.asyncMap(write),
        pull.onEnd(err=>{
          if (err) console.error(err)
          cb(err)
        })
      )

      function write(item, cb) {
        const {seq, key, value} = item
        const batch = [{
          key: META,
          value: {version, since: seq},
          valueEncoding: 'json',
          keyEncoding: 'utf8',
          type: 'put'
        }, { 
          key, value, type: 'put' 
        }]
        db.batch(batch, err=>{
          if (err) return cb(err)
          since.set(batch[0].value.since)
          cb(null)
        })
      }
    }
    
    function create() {
      closed = false
      if (!log.filename) {
        throw new Error(
          'flumeview-level-aggregate can only be used with a log that provides a directory'
        )
      }
      return Level(path.join(dir, name), {
        keyEncoding: charwise,
        valueEncoding: 'json'
      })
    }

    function close (cb) {
      if (typeof cb !== 'function') {
        cb = noop
      }

      closed = true
      if (outdated) return db.close(cb)
      if (!db) return cb()
      since.once(() => db.close(cb) )
    }

    function destroy (cb) {
      // FlumeDB restarts the stream as soon as the stream is cancelled, so the
      // rebuild happens before `writer.abort()` calls back. This means that we
      // must run `since.set(-1)` before aborting the stream.
      since.set(-1)

      // The `clear()` method must run before the stream is closed, otherwise
      // you can have a situation where you:
      //
      // 1. Flumeview-Level closes the stream
      // 2. FlumeDB restarts the stream
      // 3. Flumeview-Level processes a message
      // 4. Flumeview-Level runs `db.clear()` and deletes that message.
      db.clear(cb)
    }

    function get(key, cb) {
      // wait until the log has been processed up to the current point.
      db.get(key, function (err, value) {
        if (err && err.name === 'NotFoundError') return cb(err)
        if (err) {
          return cb(
            explain(err, 'flumeview-level-aggregate.get: key not found:' + key)
          )
        }
        cb(err, value)
      })
    }

    function read(opts) {
      // TODO: why this?
      var lower = ltgt.lowerBound(opts)
      if (lower == null) opts.gt = null

      function format (key, value) {
        return opts.keys && opts.values
          ? { key: key, value: value }
          : opts.keys
          ? key
          : value
      }

      return pull(
        pl.read(db, opts),
        pull.filter(op => op.key !== META),
        pull.map(data => format(data.key, data.value))
      )
    }

  }

}
