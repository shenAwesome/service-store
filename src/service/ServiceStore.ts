import produce from 'immer'
import * as React from 'react'
import { createStore as reduxCreateStore, combineReducers, compose, applyMiddleware, Store } from 'redux'
import { connect as reduxConnect, Provider as reduxProvider } from 'react-redux'
import { Action, Model, Plugin, UIBroker, middleware } from './core'
import { start } from 'repl';

function iterate(obj: object, keys: string[], func: (val: any, key: string) => void) {
  const skipFields = (obj['_privateFields_'] || []).concat(['onModelInstalled']),
    filter = (k: any) => !(k.startsWith('_') || includes(skipFields, k) || k == 'constructor')
  keys.filter(filter).forEach(key => {
    try {
      func(obj[key], key)
    } catch (e) {
      console.error(key)
    }
  })
}
/**iterate object*/
function each(obj: object, func: (val: any, key: string) => void) {
  iterate(obj, Object.keys(obj), func)
}
/**iterate model methods*/
function eachMethod(obj: object, func: (val: any, key: string) => void) {
  const keys = Object.getOwnPropertyNames(Object.getPrototypeOf(obj))
  iterate(obj, keys, func)
}

function includes(array: any[], item: any) {
  return array.indexOf(item) != -1
}

class Effect {
  parent: Effect
  constructor(public id: string, public actionType: string) { }
  children: Effect[] = []

  startTime = 0
  finishTime = 0
  start() {
    this.startTime = Date.now()
    this.onStart()
  }
  finish() {
    this.finishTime = Date.now()
    this.onFinish()
  }

  onStart() { }
  onFinish() { }

  cancel() { }
}

/**
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
  public broker = new UIBroker()

  public effects: Effect[] = []

  private getEffect(match: (effect: Effect) => boolean) {
    function search(effects: Effect[]) {
      let find: Effect = null
      effects.some(c => {
        if (match(c)) {
          find = c
          return true
        } else {
          find = search(c.children)
          return find != null
        }
      })
      return find
    }
    return search(this.effects)
  }

  private getEffectById(id: string) {
    return this.getEffect(effect => effect.id == id)
  }

  private getEffectByActionType(actionType: string) {
    return this.getEffect(effect => effect.actionType == actionType)
  }

  private removeEffect(id: string) {
    var effect = this.getEffectById(id)
    if (effect) {
      if (effect.parent) {
        effect.parent.children = effect.parent.children.filter(c => c != effect)
      }
      this.effects = this.effects.filter(e => e !== effect)
    }
  }

  private getEffectRoot(id: string) {
    let effect = this.getEffectById(id)
    while (effect && effect.parent) {
      effect = effect.parent
    }
    return effect
  }

  private getEffectRootId(id: string) {
    var root = this.getEffectRoot(id)
    return root ? root.id : null
  }

  private hasEffect(id: string) {
    return this.getEffectById(id) != null
  }

  private createEffect(actionType: string, parentId?: string) {
    const effectId = Date.now() + (Math.random() + '').substring(2),
      effect = new Effect(effectId, actionType)

    if (parentId) {
      let parent = this.getEffectById(parentId)
      if (parent) {
        parent.children.push(effect)
        effect.parent = parent
      }
    } else {
      this.effects.push(effect)
    }
    effect.onFinish = () => {
      this.removeEffect(effect.id)
    }

    effect.cancel = () => {
      this.store.dispatch({  //fire finishing action
        type: actionType, payload: null, effectId, //should be single line
        isEffectFinish: true
      } as Action)
    }

    return effect
  }

  private modelHelper = {
    getModel: (Class: any) => {
      const s = this,
        modelId = s.getModelIdByClass(Class),
        dispatch = s.dispatch[modelId],
        state = s.store.getState()[modelId],
        computed = s.computedFields[modelId]
      if (!state) {
        const modeIds = Object.keys(s.models).join(','),
          msg = `${modelId} is not a valid model ID. Currently installed:${modeIds} }`
        console.error(msg)
        return null
      }
      return { ...state, ...computed, ...dispatch }
    },
    getBroker: () => {
      return this.broker
    }
  }

  constructor(public models: T, middleware = [] as any[], reducer?: Function) {
    const dispatcher = this.dispatcher,
      reducers = {},
      effectTypes: string[] = [],
      effectFunctions = {},
      modelMiddleware: Function[] = [],
      pluginIds: string[] = []

    each(models as any, (model, modelId) => {
      /* for each model, create state, reducers*/
      //create state from fields
      const model_state = {}
      each(model, (val, key) => (model_state[key] = val))
      //create reducer,middleware,effect,calcluated field from methods
      const model_dispatch = (dispatcher[modelId] = {}), //dispatch wrapper, so we can dispatch with method calling
        model_computedFields = (this.computedFields[modelId] = {}), //calcuated fields
        model_reducers = [] as Function[] //reducers
      let isPlugin = model instanceof Plugin
      eachMethod(model, (method, methodName) => {
        if (method.isComputed) {
          //calc fields
          model_computedFields[methodName] = method
        } else if (method.isMiddleware) {
          // middleware. every middleware is called on every dispatch
          modelMiddleware.push((store: any) => (next: any) => (action: Action) => {
            const { type } = action,
              isEffect = includes(effectTypes, action.type),
              isEffectFinish = action.isEffectFinish,
              isPluginAction = includes(pluginIds, type.split('/')[0]),
              serviceStore = this,
              effectId = action.effectId,
              effectRootId = this.getEffectRootId(effectId)

            const ret = method.call(
              { ...store.getState()[modelId], ...model_computedFields, ...model_dispatch },
              { store, next, action } as middleware.Context,
              {
                isEffect, isEffectFinish, isPluginAction,
                model, type, serviceStore, effectId, effectRootId
              } as middleware.Info
            )
            return (ret === undefined) ? next(action) : ret
          })
        } else {
          //effect or reducer
          const actionType = `${modelId}/${methodName}`
          if (method.isEffect) {
            //effect
            effectTypes.push(actionType)
            effectFunctions[actionType] = { modelId, methodName, method }
          } else {
            //reducer
            const reducer = (state: any, action: Action) => {
              const match = action.type == actionType
              return match ? produce(state, draftState => {
                method.call(draftState, action.payload)
              }) : state
            }
            model_reducers.push(reducer)
          }
          //a dispatch method for firing action (effect or reducer)
          model_dispatch[methodName] = (payload: any) =>
            store.dispatch({ type: actionType, payload })

          if (method.singleEffect) {
            const effectMethod = model_dispatch[methodName],
              singletonM = (payload: any) => {
                const { runAt, debounce } = method.singleEffect
                const effect = this.getEffectByActionType(actionType)
                if (effect) effect.cancel()
                return effectMethod(payload)
              }
            model_dispatch[methodName] = singletonM
          }
        }
      })
      //combine reducers in one model
      reducers[modelId] = (state: any, action: any) =>
        model_reducers.reduce(
          (s, reducer) => reducer(s, action),
          state == undefined ? model_state : state //todo maybe should use init state in createstore
        )
      if (isPlugin) {
        pluginIds.push(modelId)
      }
      if (model['onModelInstalled']) {
        model['onModelInstalled'](this, model_dispatch, modelId)
      }
    })

    /**
     * the middleware to handle effects
     * @param store
     */
    const effectHandler = (store: any) => (next: any) => (action: any) => {
      const { type, isEffectFinish } = action as Action

      //to achieve effect cancelling, for example, a effect does ajax then calls a reducer.
      //you can cancel it when it's running , the reducer will be blocked
      if (action.effectId) {
        if (!this.hasEffect(action.effectId)) {
          throw `${action.type} has been cancelled`
        }
      }
      //pass if it is a reducer
      if (!includes(effectTypes, type)) return next(action)
      //this is a 'finishing' action, effect just finished
      if (isEffectFinish) {
        //console.log('effectHandler closing...', action.type) 
        const effect = this.getEffectById(action.effectId)
        if (effect) {
          //console.log(effect)
          effect.finish()
        } else {
          console.log('cannot find when close', action)
        }
        //console.log(this.effects)
        return action.payload
      }
      //handle effect
      const { modelId, method } = effectFunctions[type]

      //start an effect
      const effect = this.createEffect(type, action.effectId),
        effectId = action.effectId = effect.id
      const effectDispatch = {}
      Object.keys(this.dispatcher[modelId]).forEach(methodName => {
        effectDispatch[methodName] = payload =>
          store.dispatch({
            type: `${modelId}/${methodName}`,
            payload, effectId
          } as Action)
      })

      const state = store.getState(),
        modelState = state[modelId],
        computed = this.computedFields[modelId],
        helper = models[modelId] instanceof Model ? this.modelHelper : null,
        mixedContext = { ...modelState, ...computed, ...effectDispatch, ...helper }

      effect.start()

      var ret = method.call(mixedContext, action.payload, state)

      next(action)
      //use Promise.resolve incase effect returns non promise
      return Promise.resolve(ret).then((payload: any) =>
        store.dispatch({  //fire finishing action
          type, payload, effectId, //should be single line
          isEffectFinish: true
        } as Action)
      ).catch(reason => {
        console.log(reason)
      })
    }

    let combinedReducer = combineReducers(reducers)
    if (reducer) {
      //compose
      let _reducer = combinedReducer
      combinedReducer = (state: any, action: any) => {
        return reducer(_reducer(state, action), action)
      }
    }

    const composeEnhancers = window['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__'] || compose
    middleware = modelMiddleware.concat([effectHandler]).concat(middleware)
    const store = (this.store = reduxCreateStore(
      combinedReducer,
      composeEnhancers(applyMiddleware(...middleware))
    ))
  }

  /**
   * return the targetting model of the action
   * @param actionType
   */
  getModelByActionType(actionType: string) {
    const modelId = actionType.split('/')[0]
    return this.models[modelId]
  }

  getModelIdByClass(actionType: any) {
    let modelId: string = null
    each(this.models as any, (val: any, key: string) => {
      const match = val instanceof actionType
      if (match) modelId = key
    })
    return modelId
  }

  get dispatch(): T {
    return this.dispatcher as any
  }

  dispatchPool: { [effectId: string]: any } = {}
  getEffectDispatch(effectId) {
    const { dispatchPool } = this
    if (!dispatchPool[effectId]) {
      const effectDispatch = (dispatchPool[effectId] = {}),
        { dispatcher, store } = this
      each(dispatcher, (modelDispatch, modelId) => {
        const modelEffectDispatch = (effectDispatch[modelId] = {})
        each(modelDispatch, (method, methodName) => {
          modelEffectDispatch[methodName] = function (payload) {
            const type = `${modelId}/${methodName}`
            store.dispatch({ type, payload, effectId })
          }
        })
      })
    }
    return dispatchPool[effectId]
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
    const connect = (
      stateMap: ((state: T) => object) //decorator factory
    ) => (method: any) => reduxConnect(() => stateMap(this.getMergedState()))(method) as any
    return connect
  }

  _lastState = null
  _lastMergedState = null
  private getMergedState() {
    const state = this.state
    if (state == this._lastState) return this._lastMergedState //use cache

    const mergedState = {}
    Object.keys(state).forEach(modelId => {
      const modelState = state[modelId],
        computed = this.computedFields[modelId],
        helper = this.models[modelId] instanceof Model ? this.modelHelper : null
      mergedState[modelId] = { ...modelState, ...computed, ...helper }
    })
    this._lastState = state
    this._lastMergedState = mergedState
    return mergedState as any
  }

  pluginUIs = []

  get Provider() {
    const { store, pluginUIs } = this
    return (props: any) => {
      const pluginEles = pluginUIs.map((ui, i) => React.createElement(ui, { key: i }) as any),
        propChildren = React.Children.toArray(props.children),
        wrapper = React.createElement(React.Fragment, {}, pluginEles.concat(propChildren))
      return React.createElement(reduxProvider, { store }, wrapper)
    }
  }

  getService = (name: string) => {
    return this.dispatch[name] as any
  }
}

function createStore<T>(models: T, middlewares?: Function[], reducer?: Function) {
  return new ServiceStore(models, middlewares, reducer)
}

export { createStore, ServiceStore }
