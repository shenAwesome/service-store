import produce from 'immer'
import { createStore as reduxCreateStore, combineReducers, compose, applyMiddleware, Store } from 'redux'
import { connect as reduxConnect, Provider as reduxProvider } from 'react-redux'
import * as React from 'react'
import { Action } from './core'

function iterate(obj: object, keys: string[], func: (val: any, key: string) => void) {
    const skipFields = obj['_privateFields_'] || [],
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

    constructor(public models: T, middleware = [] as any[], reducer?: Function) {

        const reducers = {},
            modelMiddleware: any[] = [],
            dispatcher = this.dispatcher,
            effectTypes = [] as string[],
            effects = {},
            pluginIds = [] as string[]
        each(models as any, (model, modelId) => {  /* for each model, create state, reducers*/

            //create state from fields
            const model_state = {}
            each(model, (val, key) => model_state[key] = val)

            //create reducer,middleware,effect,calcluated field from methods 
            const model_dispatch = dispatcher[modelId] = {},   //dispatch wrapper, so we can dispatch with method calling 
                model_computedFields = this.computedFields[modelId] = {}, //calcuated fields 
                model_reducers = [] as Function[] //reducers 
            let isPlugin = false
            eachMethod(model, (method, methodName) => {
                if (method.isComputed) { //calc fields 
                    model_computedFields[methodName] = method
                } else if (method.isMiddleware) {// middleware.  all get called on every dispatch 
                    isPlugin = true
                    modelMiddleware.push((store: any) => (next: any) => (action: any) => {
                        const { effectId, type } = action
                        let ret = method.call(model_dispatch, { store, next, action }, {
                            isEffect: includes(effectTypes, action.type),
                            isEffectFinish: effectId && effectId.startsWith('_EffectFinish_'),
                            isPluginAction: includes(pluginIds, type.split('/')[0]),
                            model, type, serviceStore: this
                        })
                        if (ret == undefined) ret = next(action)
                        return ret
                    })
                } else if (method.isEffect) {
                    const actionType = `${modelId}/${methodName}`
                    effectTypes.push(actionType)
                    effects[actionType] = { modelId, methodName, method }
                    //a dispatcher ready for firing actions
                    model_dispatch[methodName] = (payload: any, effectId?: string) => (
                        store.dispatch({ type: actionType, payload, effectId })
                    )
                } else { //reducers 
                    const actionType = `${modelId}/${methodName}`
                    const reducer = (state: any, action: Action) => (
                        (action.type == actionType) ? produce(state, draftState => {
                            method.call(draftState, action.payload)
                        }) : state
                    )
                    //a dispatcher ready for firing actions
                    model_dispatch[methodName] = function (payload: any, effectId?: string) {
                        return store.dispatch({ type: actionType, payload, effectId })
                    }
                    model_reducers.push(reducer)
                }
            })
            reducers[modelId] = (state: any, action: any) => (
                model_reducers.reduce((s, reducer) => reducer(s, action),
                    (state == undefined) ? model_state : state)
            )
            if (isPlugin) pluginIds.push(modelId)
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
                if ((action.effectId + '').startsWith(FinishFlag)) { //finish
                    return action.payload
                } else { //start an effect
                    if (!action.effectId) {//a root effect
                        action.effectId = Date.now() + Math.random() + ''
                    }
                    const { effectId } = action,
                        model_dispatch = dispatcher[modelId],
                        effectDispatch = {}  //make a special dispath to inject effectId to all actions happens in this effect.
                    each(model_dispatch, (fn, key) => {
                        effectDispatch[key] = (payload: any) => fn(payload, effectId)
                    })
                    const modelState = store.getState()[modelId],
                        computed = this.computedFields[modelId],
                        mixedContext = { ...modelState, ...computed, ...effectDispatch, _getDispatch_: this.getDispatch },
                        prom = method.call(mixedContext, action.payload, store.getState())
                    next(action)
                    //effect can be normal function and return non promise
                    return Promise.resolve(prom).then((ret: any) => {
                        return model_dispatch[methodName](ret, FinishFlag + effectId) //send finish signal
                    })
                }
            }
            return next(action)
        }



        let combinedReducer = combineReducers(reducers)
        if (reducer) {//compose
            let _reducer = combinedReducer
            combinedReducer = (state: any, action: any) => {
                return reducer(_reducer(state, action), action)
            }
        }

        const composeEnhancers = window['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__'] || compose;
        const store = this.store = reduxCreateStore(combinedReducer, composeEnhancers(
            applyMiddleware(...modelMiddleware.concat([effectHandler]).concat(middleware))
        ))
    }


    getDispatch = (modelName: string) => {
        return this.dispatch[modelName]
    }

    /**
     * return the targetting model of the action
     * @param actionType 
     */
    getModel(actionType: string) {
        const modelId = actionType.split('/')[0]
        return this.models[modelId]
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
        const connect = (stateMap: ((state: T) => object)) => ( //decorator factory
            (method: any) => (//decorator
                reduxConnect((state: any) => {
                    return stateMap(mergeFields(state, computedFields))
                })(method) as any
            )
        )
        return connect
    }

    get Provider() {
        const { store } = this
        return (props: any) => {
            return React.createElement(reduxProvider, { store }, props.children)
        }
    }

    getService = (name: string) => {
        return this.dispatch[name] as any
    }
}

function mergeFields(state: any, computedFields: any) {
    const mixedState = {}
    Object.keys(state).forEach(modelId => {
        mixedState[modelId] = { ...state[modelId], ...computedFields[modelId] }
    })
    return mixedState as any
}


function createStore<T>(models: T, middlewares?: Function[], reducer?: Function) {
    return new ServiceStore(models, middlewares, reducer)
}


export { createStore }




