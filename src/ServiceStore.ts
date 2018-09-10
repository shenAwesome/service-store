import produce from 'immer'
import { createStore, combineReducers, compose, applyMiddleware, Store } from 'redux'
import { connect as reduxConnect, Provider as reduxProvider } from 'react-redux'
import * as React from 'react'


function tag(object: any, method: string, tag: string) {
    object[method][tag] = true
}
/*--------------decorators----------------*/
/**
 * decorator to tag a method as effect
 */
const effect = (target: any, key: string) => {
    tag(target, key, 'isEffect')
}
/**
 * decorator to tag a method as calculated field
 */
const computed = (target: any, key: string) => {
    tag(target, key, 'isComputed')
}
/**
 * decorator to tag a method as middleware
 */
const middleware = (target: any, key: string) => {
    tag(target, key, 'isMiddleware')
}

/*iterate object*/
function each(obj: object, func: (val: any, key: string) => void) {
    const skipFields = obj['_skipFields_'] || [],
        filter = (k: any) => !(k.startsWith('_') || includes(skipFields, k) || k == 'constructor')
    Object.keys(obj).filter(filter).forEach(key => {
        return func(obj[key], key)
    })
}
/*iterate model methods*/
function eachMethod(obj: object, func: (val: any, key: string) => void) {
    const p = Object.getPrototypeOf(obj),
        keys = Object.getOwnPropertyNames(p),
        skipFields = obj['_skipFields_'] || [],
        filter = (k: any) => !(k.startsWith('_') || includes(skipFields, k) || k == 'constructor')
    keys.filter(filter).forEach(key => {
        return func(obj[key], key)
    })
}

function includes(array: any[], item: any) {
    return array.indexOf(item) != -1
}
/**
 * yarn add react-redux immer lodash redux
 * yarn add @types/react-redux @types/lodash @types/redux --dev
 * convert class to redux state & action
 * @param cls
 * @param modelId
 */
class ServiceStore<T> {
    /**
     * the redux store instance
     */
    public store: Store
    private dispatcher = {}
    private computedFields = {}
    public pluginIds = [] as string[]

    constructor(public models: T, middleware = [] as any[]) {
        this.initStore(models, middleware)
    }

    private initStore(models: T, middleware: any[]) {
        const reducers = {},
            modelMiddleware: any[] = [],
            dispatcher = this.dispatcher,
            effectTypes = [] as string[],
            effects = {}
        each(models as any, (model, modelId) => {  /* for each model, create state, reducers*/
            //create state from fields
            const model_state = {}
            each(model, (val, key) => model_state[key] = val)

            const model_dispatch = dispatcher[modelId] = {},   //dispatch wrapper, so we can dispatch with method calling 
                model_computedFields = this.computedFields[modelId] = {}, //calcuated fields 
                model_reducers = [] as Function[] //reducers
            //create reducer,middleware,effect,calcluated field from methods 
            let isPlugin = false
            eachMethod(model, (method, methodName) => {
                if (method.isComputed) { //calc fields
                    //model_computedFields[methodName] = () => method.call(store.getState()[modelId])
                    model_computedFields[methodName] = method
                } else if (method.isMiddleware) {// middleware.  all get called on every dispatch 
                    isPlugin = true
                    modelMiddleware.push((store: any) => (next: any) => (action: any) => {
                        let ret = method.call(model_dispatch, { store, next, action }, {
                            type: action.type,
                            isEffect: includes(effectTypes, action.type),
                            isEffectFinish: action.payload == '_EffectFinish_',
                            isModelAction: this.isPluginAction(action.type),
                            model: model,
                            serviceStore: this
                        })
                        if (ret == undefined) ret = next(action)
                        return ret
                    })
                } else if (method.isEffect) {
                    const actionType = `${modelId}/${methodName}`
                    effectTypes.push(actionType)
                    effects[actionType] = { modelId, methodName, method }
                    //a dispatcher ready for firing actions
                    model_dispatch[methodName] = function(payload: any, effectId?: string) {
                        return store.dispatch({ type: actionType, payload, effectId })
                    }
                } else { //reducers 
                    const actionType = `${modelId}/${methodName}`
                    const reducer = (state: any, action: Action) => {
                        let ret = state
                        if (action.type == actionType) {
                            ret = produce(state, draftState => {
                                method.call(draftState, action.payload)
                            })
                        }
                        return ret
                    }
                    //a dispatcher ready for firing actions
                    model_dispatch[methodName] = function(payload: any, effectId?: string) {
                        return store.dispatch({ type: actionType, payload, effectId })
                    }
                    model_reducers.push(reducer)
                }
            })
            reducers[modelId] = (state: any, action: any) => (
                model_reducers.reduce((s, reducer) => reducer(s, action),
                    (state == undefined) ? model_state : state)
            )
            if (isPlugin) this.pluginIds.push(modelId)
        })

        /**
         * the middleware to handle effects
         * @param store 
         */
        const effectHandler = (store: any) => (next: any) => (action: any) => {
            const { type } = action,
                FinishFlag = '_EffectFinish_'
            if (includes(effectTypes, type)) {
                const { modelId, methodName, method } = effects[type]
                if (action.effectId != FinishFlag) { //start
                    const effectId = action.effectId || Date.now() + Math.random() + '',
                        model_dispatch = dispatcher[modelId], //todo , patch this 
                        effectDispatch = {}  //make a special dispath to inject effectId to all actions happens in this effect.
                    each(model_dispatch, (fn, key) => {
                        effectDispatch[key] = (payload: any) => fn(payload, effectId)
                    })
                    const modelState = store.getState()[modelId],
                        mixedContext = { ...modelState, ...effectDispatch },
                        prom = method.call(mixedContext, action.payload, store.getState())
                    action.effectId = effectId
                    next(action)
                    return prom.then((ret: any) => model_dispatch[methodName](ret, FinishFlag))
                } else {
                    return action.payload
                }
            }
            return next(action)
        }

        const composeEnhancers = window['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__'] || compose;
        const store = this.store = createStore(combineReducers(reducers), composeEnhancers(
            applyMiddleware(...modelMiddleware.concat([effectHandler]).concat(middleware))
        ))
    }

    /**
     * return the targetting model of the action
     * @param actionType 
     */
    getModel(actionType: string) {
        const modelId = actionType.split('/')[0]
        return this.models[modelId]
    }

    /**
     * check if an action is targeting a plugin
     * @param actionType 
     */
    isPluginAction(actionType: string) {
        const modelId = actionType.split('/')[0]
        return includes(this.pluginIds, modelId)
    }

    get dispatch(): T {
        return this.dispatcher as any
    }

    /**
     * root state, doesn't feel very useful?
     */
    get state(): T {
        return this.store.getState()
    }

    /**
     * connect decorator to use with React.Component.
     * it maps state (or calcudated fields) to component props
     */
    get connect() {
        const { computedFields } = this
        const connect = function(stateMap: ((state: T) => object)) {
            return function(method: any) {
                return reduxConnect((state: any) => {
                    return stateMap(mergeComputedFields(state, computedFields))
                })(method) as any
            }
        }
        return connect
    }

    get Provider() {
        const { store } = this
        return (props: any) => {
            return React.createElement(reduxProvider, { store }, props.children)
        }
    }
}

function mergeComputedFields(state: any, computedFields: any) {
    const mixedState = {}
    Object.keys(state).forEach(modelId => {
        mixedState[modelId] = { ...state[modelId], ...computedFields[modelId] }
    })
    return mixedState as any
}

/* built in models */
/**
 * for showing loading status
 */
class Loading {

    current: { [actionType: string]: number } = {}

    @computed
    count() {
        const { current } = this
        return Object.keys(current)
            .reduce((count, key) => count + current[key], 0)
    }

    addAction(actionType: string) {
        let actionCount = this.current[actionType] || 0
        this.current[actionType] = actionCount + 1
    }

    removeAction(actionType: string) {
        this.current[actionType] = this.current[actionType] - 1
    }

    @middleware
    onDispatch(mwContext: any, modelContext: any) {
        const { isEffect, isEffectFinish, type } = modelContext
        if (isEffect) {
            if (isEffectFinish) {
                this.removeAction(type)
            } else {
                this.addAction(type)
            }
        }
    }
}

interface LoggingCfg {
    log: (type: string, payload: any, state: any, queue?: any[]) => void
    filter: (ctx: any, mCtx: any) => boolean
}
class Logging {
    _skipFields_ = ['effectPool', 'log', 'filter']
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
            { type, isEffectFinish, isModelAction } = mCtx,
            { action, next, store } = ctx,
            result = next(action)

        if (!isModelAction && filter(ctx, mCtx)) {
            const state = store.getState(),
                { payload, effectId } = action

            if (effectId) {
                if (!effectPool[effectId]) {
                    effectPool[effectId] = { start: Date.now(), queue: [], payload }
                }
                const { queue, start } = effectPool[effectId],
                    timePast = (Date.now() - start) + 'ms'
                if (isEffectFinish) {//take out and log   
                    const first = queue.shift()
                    log(`${type} (total:${timePast})`, first.payload, state, queue)
                } else {
                    queue.push({
                        type, time: timePast,
                        payload: payload,
                        state: state
                    })
                }
            } else {
                log(type, payload, state)
            }
        }

        return result
    }
}

interface Action {
    type: string
    payload: any
    effectId?: string
}

const plugins = { Loading, Logging }

export { ServiceStore, effect, computed, plugins }




