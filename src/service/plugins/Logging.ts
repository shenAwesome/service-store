import { computed, middleware, Action, Plugin } from '../core'

interface LoggingCfg {
  log: (type: string, payload: any, state: any, queue?: any[]) => void
  filter: (ctx: any, mCtx: any) => boolean
}
class Logging extends Plugin {
  _privateFields_ = ['effectPool', 'log', 'filter']
  effectPool = {}
  log(type: string, payload: any, state: any, queue: any[] = []) {
    const modelId = type.split('/')[0]
    if (state[modelId]) state = state[modelId]
    console.groupCollapsed(type)
    console.log('payload:', payload)
    if (queue.length) {
      console.groupCollapsed('reducers:' + queue.map(q => q.type).join(','))
      queue.forEach((q: any) => {
        console.group(q.type + ' start at ' + q.time)
        console.log('payload:', q.payload)
        console.log('state:', q.state)
        console.groupEnd()
      })
      console.groupEnd()
      console.log('state:', state)
    }
    console.groupEnd()
  }
  filter(ctx: any, mCtx: any) {
    return true
  }

  constructor(cfg?: Partial<LoggingCfg>) {
    super()
    Object.assign(this, cfg)
  }

  @middleware
  onDispatch(ctx: any, mCtx: any) {
    const { log, filter, effectPool } = mCtx.model as Logging,
      { type, isPluginAction, isEffect, isEffectFinish } = mCtx,
      { action, next, store } = ctx,
      modelId = type.split('/')[0],
      result = next(action) //to finish effect first
    //console.log('logging,' + action + ',' + isEffectFinish + ',' + result) 
    //console.log(isPluginAction + ',' + type)
    if (!isPluginAction && filter(ctx, mCtx)) {
      const state = store.getState()[modelId],
        { payload, effectId } = action as Action

      if (effectId) {
        //console.log({ isEffectFinish })
        if (!effectPool[effectId]) {
          effectPool[effectId] = { start: Date.now(), queue: [], payload }
        }
        const { queue, start } = effectPool[effectId],
          time = Date.now() - start + 'ms'
        if (isEffectFinish) {
          //console.log(type, queue)
          //take out and log when effect finishes
          //console.log('finish=' + eId)
          if (type == queue[0].type) {
            const first = queue.shift()
            log(`${type} (total:${time})`, first.payload, state, queue)
            delete effectPool[effectId]
          }
        } else {
          const record = { type, time, payload, state, isEffect }
          if (!queue.some(q => q.isEffect)) {
            queue.unshift(record)
          } else {
            queue.push(record)
          }
        }
      } else {
        log(type, payload, state)
      }
    }
    return result === undefined ? null : result
  }
}

export { Logging }
