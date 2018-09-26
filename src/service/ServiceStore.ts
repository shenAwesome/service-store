import produce from 'immer'
import * as React from 'react'
import {
  createStore as reduxCreateStore,
  combineReducers,
  compose,
  applyMiddleware,
  Store
} from 'redux'
import { connect as reduxConnect, Provider as reduxProvider } from 'react-redux'
import { Action, Model, Plugin, UIBroker } from './core'

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

class EffectSession {
  constructor(public id: string, public actionType: string) {}
  children: EffectSession[] = []
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

  public effectSessions: EffectSession[] = []

  private findEffectSession(id: string) {
    function search(sessions: EffectSession[], id: string) {
      let find: EffectSession = null
      sessions.some(c => {
        if (c.id == id) {
          find = c
          return true
        } else {
          find = search(c.children, id)
          return find != null
        }
      })
      return find
    }
    return search(this.effectSessions, id)
  }

  private startEffectSession(actionType: string, parentId?: string) {
    const effectId = Date.now() + (Math.random() + '').substring(2),
      session = new EffectSession(effectId, actionType)

    if (parentId) {
      let parent = this.findEffectSession(parentId)
      if (parent) parent.children.push(session)
    } else {
      this.effectSessions.push(session)
    }
    return effectId
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
      effects = {},
      modelMiddleware: Function[] = [],
      effectTypes: string[] = [],
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
            const { effectId, type } = action,
              isEffect = includes(effectTypes, action.type),
              isEffectFinish = action.isEffectFinish,
              isPluginAction = includes(pluginIds, type.split('/')[0]),
              serviceStore = this,
              ret = method.call(
                { ...store.getState()[modelId], ...model_computedFields, ...model_dispatch },
                { store, next, action },
                { isEffect, isEffectFinish, isPluginAction, model, type, serviceStore }
              ),
              noResult = ret === undefined
            return noResult ? next(action) : ret
          })
        } else {
          //effect or reducer
          const actionType = `${modelId}/${methodName}`
          if (method.isEffect) {
            //effect
            effectTypes.push(actionType)
            effects[actionType] = { modelId, methodName, method }
          } else {
            //reducer
            const reducer = (state: any, action: Action) => {
              const match = action.type == actionType
              return match
                ? produce(state, draftState => {
                    method.call(draftState, action.payload)
                  })
                : state
            }
            model_reducers.push(reducer)
          }
          //a dispatch method for firing action (effect or reducer)
          model_dispatch[methodName] = (payload: any, effectId?: string) =>
            store.dispatch({ type: actionType, payload, effectId })
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
      //skip if not an effect
      if (!includes(effectTypes, type)) return next(action)
      //already finished
      if (isEffectFinish) {
        //console.log('effectHandler closing...', action.type)
        const { effectId } = action
        let session = this.findEffectSession(effectId)
        if (!session) throw `${action.type} has been cancelled`
        //remove it if it's root
        this.effectSessions = this.effectSessions.filter(s => s.id != effectId) //clear session
        //console.log(this.effectSessions)
        return action.payload
      }
      //handle effect
      const { modelId, methodName, method } = effects[type]

      //start an effect
      const effectId = this.startEffectSession(type, action.effectId)
      action.effectId = effectId
      const effectDispatch = {}
      Object.keys(this.dispatcher[modelId]).forEach(methodName => {
        effectDispatch[methodName] = payload => {
          return store.dispatch({
            type: `${modelId}/${methodName}`,
            payload,
            effectId
          } as Action)
        }
      })

      const state = store.getState(),
        modelState = state[modelId],
        computed = this.computedFields[modelId],
        helper = models[modelId] instanceof Model ? this.modelHelper : null,
        mixedContext = { ...modelState, ...computed, ...effectDispatch, ...helper },
        ret = method.call(mixedContext, action.payload, state)

      next(action)
      //use Promise.resolve incase effect returns non promise
      return Promise.resolve(ret).then((payload: any) => {
        return store.dispatch({
          //fire finishing action
          type,
          payload,
          effectId,
          isEffectFinish: true
        } as Action)
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
          modelEffectDispatch[methodName] = function(payload) {
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
