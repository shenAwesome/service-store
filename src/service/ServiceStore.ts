import produce from 'immer'
import {
  createStore as reduxCreateStore,
  combineReducers,
  compose,
  applyMiddleware,
  Store
} from 'redux'
import { connect as reduxConnect, Provider as reduxProvider } from 'react-redux'
import * as React from 'react'
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

  private modelHelper = {
    getModel: (Class: any) => {
      const s = this,
        modelId = s.getModelIdByClass(Class),
        dispatch = s.dispatch[modelId],
        state = s.store.getState()[modelId],
        computed = s.computedFields[modelId]
      if (!state) {
        console.error(
          `${modelId} is not a valid model ID. Currently installed models: ${Object.keys(
            s.models
          ).join(',')} `
        )
        return null
      }
      return { ...state, ...computed, ...dispatch }
    },
    getBroker: () => {
      return this.broker
    }
  }

  constructor(public models: T, middleware = [] as any[], reducer?: Function) {
    const reducers = {},
      modelMiddleware: any[] = [],
      dispatcher = this.dispatcher,
      effectTypes = [] as string[],
      effects = {},
      pluginIds = [] as string[]

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
          // middleware.  all get called on every dispatch
          modelMiddleware.push((store: any) => (next: any) => (action: any) => {
            const { effectId, type } = action
            let ret = method.call(
              model_dispatch,
              { store, next, action },
              {
                isEffect: includes(effectTypes, action.type),
                isEffectFinish: effectId && effectId.startsWith('_EffectFinish_'),
                isPluginAction: includes(pluginIds, type.split('/')[0]),
                model,
                type,
                serviceStore: this
              }
            )
            if (ret == undefined) ret = next(action)
            return ret
          })
        } else if (method.isEffect) {
          const actionType = `${modelId}/${methodName}`
          effectTypes.push(actionType)
          effects[actionType] = { modelId, methodName, method }
          //a dispatcher ready for firing actions
          model_dispatch[methodName] = (payload: any, effectId?: string) =>
            store.dispatch({ type: actionType, payload, effectId })
        } else {
          //reducers
          const actionType = `${modelId}/${methodName}`
          const reducer = (state: any, action: Action) =>
            action.type == actionType
              ? produce(state, draftState => {
                  method.call(draftState, action.payload)
                })
              : state
          //a dispatcher ready for firing actions
          model_dispatch[methodName] = function(payload: any, effectId?: string) {
            return store.dispatch({ type: actionType, payload, effectId })
          }
          model_reducers.push(reducer)
        }
      })
      reducers[modelId] = (state: any, action: any) =>
        model_reducers.reduce(
          (s, reducer) => reducer(s, action),
          state == undefined ? model_state : state
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
      const { type } = action,
        FinishFlag = '_EffectFinish_'
      if (includes(effectTypes, type)) {
        const { modelId, methodName, method } = effects[type]
        //console.log(action.effectId)
        if ((action.effectId + '').startsWith(FinishFlag)) {
          //finish
          return action.payload
        } else {
          //start an effect
          if (!action.effectId) {
            //a root effect
            action.effectId = Date.now() + Math.random() + ''
          }
          const { effectId } = action,
            model_dispatch = dispatcher[modelId],
            effectDispatch = {} //make a special dispath to inject effectId to all actions happens in this effect.
          each(model_dispatch, (fn, key) => {
            effectDispatch[key] = (payload: any) => fn(payload, effectId)
          })
          const modelState = store.getState()[modelId],
            computed = this.computedFields[modelId],
            helper = models[modelId] instanceof Model ? this.modelHelper : null,
            mixedContext = { ...modelState, ...computed, ...effectDispatch, ...helper },
            ret = method.call(mixedContext, action.payload, store.getState())
          next(action)
          //effect can be normal function and return non promise
          return Promise.resolve(ret).then((ret: any) => {
            return model_dispatch[methodName](ret, FinishFlag + effectId) //send finish signal
          })
        }
      }
      return next(action)
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
    const store = (this.store = reduxCreateStore(
      combinedReducer,
      composeEnhancers(
        applyMiddleware(...modelMiddleware.concat([effectHandler]).concat(middleware))
      )
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
    const connect = (
      stateMap: ((state: T) => object) //decorator factory
    ) => (
      method: any //decorator
    ) =>
      reduxConnect((state: any) => {
        return stateMap(this.mergeFields(state, computedFields))
      })(method) as any
    return connect
  }

  private mergeFields(state: any, computedFields: any) {
    const mixedState = {}
    Object.keys(state).forEach(modelId => {
      const mState = (mixedState[modelId] = { ...state[modelId], ...computedFields[modelId] })
      if (this.models[modelId] instanceof Model) {
        Object.assign(mState, this.modelHelper)
      }
    })
    return mixedState as any
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
