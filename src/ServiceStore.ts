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
const calc = (target: any, key: string) => {
  tag(target, key, 'isCalc')
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
    filter = (k: any) => !k.startsWith('_') && skipFields.indexOf(k) == -1 && k !== 'constructor'
  Object.keys(obj).filter(filter).forEach(key => {
    return func(obj[key], key)
  })
}
/*iterate model methods*/
function eachMethod(obj: object, func: (val: any, key: string) => void) {
  const p = Object.getPrototypeOf(obj),
    keys = Object.getOwnPropertyNames(p),
    skipFields = obj['_skipFields_'] || [],
    filter = (k: any) => !k.startsWith('_') && skipFields.indexOf(k) == -1 && k !== 'constructor'
  keys.filter(filter).forEach(key => {
    return func(obj[key], key)
  })
}
/**
 * yarn add react-redux immer lodash redux
 * yarn add @types/react-redux @types/lodash @types/redux --dev
 * convert class to redux state & action
 * @param cls
 * @param modelName
 */
class ServiceStore<T> {
  /**
   * the redux store instance
   */
  public store: Store
  private dispatcher = {}
  private calcFields = {}

  constructor(models: T, middleware = [] as any[]) {
    this.initStore(models, middleware)
  }

  private initStore(models: T, middleware: any[]) {
    const reducers = {},
      modelMiddleware: any[] = [],
      dispatcher = this.dispatcher,
      effectTypes = [] as string[]
    each(models as any, (model, modelName) => {  /* for each model, create state, reducers*/
      //create state from fields
      const model_state = {}
      each(model, (val, key) => model_state[key] = val)

      const model_dispatch = dispatcher[modelName] = {},   //dispatch wrapper, so we can dispatch with method calling 
        model_calcFields = this.calcFields[modelName] = {}, //calcuated fields 
        model_reducers = [] as Function[] //reducers
      //create reducer,middleware,effect,calcluated field from methods 
      eachMethod(model, (method, methodName) => {
        if (method.isCalc) { //calc fields
          model_calcFields[methodName] = () => method.call(store.getState()[modelName])
        } else if (method.isMiddleware) {// middleware.  all get called on every dispatch 
          modelMiddleware.push((store: any) => (next: any) => (action: any) => {
            let ret = method.call(model_dispatch, { store, next, action }, {
              type: action.type,
              isEffect: effectTypes.indexOf(action.type) != -1,
              isEffectFinish: action.payload == '_EffectFinish_',
              model: model
            })
            if (ret == undefined) ret = next(action)
            return ret
          })
        } else { //reducers 
          const actionType = `${modelName}/${methodName}`
          if (method.isEffect) effectTypes.push(actionType)
          const reducer = (state: any, action: Action) => {
            let ret = state
            if (action.type == actionType) {
              if (!method.isEffect) { //handle normal method, simple reduer
                ret = produce(state, draftState => {
                  method.call(draftState, action.payload)
                })
              } else if (action.payload != '_EffectFinish_') { //  starts an effect, dispatch as this, state as second arguments just in case 
                const effectId = action.effectId || Date.now() + Math.random() + ''
                const effectDispatch = {}  //make a special dispath to inject effectId to all actions happens in this effect.
                each(model_dispatch, (fn, key) => {
                  effectDispatch[key] = (payload: any) => fn(payload, effectId)
                })
                ret = produce(state, draftState => {
                  let prom = method.call(effectDispatch, action.payload, draftState)
                  prom.then(() => model_dispatch[methodName]('_EffectFinish_', effectId))//dispatch a finish action
                })
              }
            }
            return ret
          }

          //a dispatcher ready for firing actions
          model_dispatch[methodName] = function (payload: any, effectId?: string) {
            store.dispatch({ type: actionType, payload, effectId })
          }
          model_reducers.push(reducer)
        }
      })
      reducers[modelName] = (state: any, action: any) => (
        model_reducers.reduce((s, reducer) => reducer(s, action),
          (state == undefined) ? model_state : state)
      )
    })
    const composeEnhancers = window['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__'] || compose;
    const store = this.store = createStore(combineReducers(reducers), composeEnhancers(
      applyMiddleware(...modelMiddleware.concat(middleware))
    ))
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
    const { calcFields } = this
    const connect = function (stateMap: ((state: T) => object), calcMap?: (calc: T) => object) {
      return function (method: any) {
        return reduxConnect((state: any) => {
          const map1 = stateMap(state),
            map2 = calcMap ? calcMap(calcFields as any) : null
          return { ...map1, ...map2 }
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

/* built in models */
/**
 * for showing loading status
 */
class Loading {

  current: { [actionType: string]: number } = {}

  @calc
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
    var modelName = type.split('/')[0]
    if (state[modelName]) state = state[modelName]
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
      { type, isEffectFinish } = mCtx,
      { action, next, store } = ctx,
      result = next(action),
      state = store.getState(),
      { effectId, payload } = action

    if (!isFirstUpperCase(type) && filter(ctx, mCtx)) {
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

function isFirstUpperCase(str: any) {
  let first = (str + '').charAt(0)
  return first == first.toUpperCase()
}

interface Action {
  type: string
  payload: any
  effectId?: string
}

const plugins = { Loading, Logging }

export { ServiceStore, effect, calc, plugins }




