flumeview-level-aggregate
---
  
*Example*

  const pull = require('pull-stream')
  const Log = require('flumelog-offset')
  const Flume = require('flumedb')

  const Aggregate = require('flumeview-level-aggregate')

  let db = Flume(Log())
  db.use('agg', Aggregate(1, fitsBucket, add, {timeout: 100}))

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

  db.append([
    {n:1},
    {n:2},
    {n:10},
  ], (err, seq) => {
    pull(
      db.agg.read({
        keys: true,
        values: true
      }),
      pull.collect( (err, items)=>{
          // { key: 0,  value: {sum: 3, l: [1, 2]} },
          // { key: 1,  value: {sum: 10, l: [10]} },
        })
      })
    )
  })


