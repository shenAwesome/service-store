
import { computed, middleware, Action } from '../core'


interface LoggingCfg {
    log: (type: string, payload: any, state: any, queue?: any[]) => void
    filter: (ctx: any, mCtx: any) => boolean
}
class Logging {
    _privateFields_ = ['effectPool', 'log', 'filter']
    effectPool = {}
    log(type: string, payload: any, state: any, queue: any[] = []) {
        var modelId = type.split('/')[0]
        if (state[modelId]) state = state[modelId]
        console.groupCollapsed(type)
        console.log('payload', payload)
        console.log('state', state)
        if (queue.length) {
            console.groupCollapsed('reducers:' + queue.map(q => q.type).join(','))
            queue.forEach((q: any) => {
                console.group(q.type + ' start at ' + q.time)
                console.log('payload', q.payload)
                console.log('state', q.state)
                console.groupEnd()
            })
            console.groupEnd()
        }
        console.groupEnd()
    }
    filter(ctx: any, mCtx: any) {
        return true
    }

    constructor(cfg?: Partial<LoggingCfg>) {
        Object.assign(this, cfg)
    }

    @middleware
    onDispatch(ctx: any, mCtx: any) {
        const { log, filter, effectPool } = (mCtx.model as Logging),
            { type, isPluginAction, isEffectFinish } = mCtx,
            { action, next, store } = ctx,
            result = next(action)

        if (!isPluginAction && filter(ctx, mCtx)) {
            const state = store.getState(),
                { payload, effectId } = action as Action

            if (effectId) {
                const eId = isEffectFinish ? effectId.replace('_EffectFinish_', '') : effectId

                if (!effectPool[eId]) {
                    effectPool[eId] = { start: Date.now(), queue: [], payload }
                }
                const { queue, start } = effectPool[eId],
                    time = (Date.now() - start) + 'ms'
                if (isEffectFinish) {//take out and log when effect finishes
                    //console.log('finish=' + eId)
                    if (type == queue[0].type) {
                        const first = queue.shift()
                        log(`${type} (total:${time})`, first.payload, state, queue)
                        //console.log('delete=' + eId)
                        delete effectPool[eId]
                    }
                } else {
                    queue.push({ type, time, payload, state })
                }
            } else {
                log(type, payload, state)
            }
        }

        return result
    }
}

export { Logging }