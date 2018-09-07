import produce from 'immer'
import { createStore, combineReducers, applyMiddleware, compose } from 'redux'
import { connect as reduxConnect, Provider } from 'react-redux'
import * as React from 'react'

/**
 * decorator to tag a method as effect
 */
const effect = (target: any, key: string) => {
  target[key].isEffect = true
}
/**
 * decorator to tag a method as selector
 */
const calc = (target: any, key: string) => {
  target[key].isCalc = true
}

/*iterate class instance*/
function forEach(obj: object, func: (val: any, key: string) => void, getMethod = false) {
  let keys = Object.keys(obj)
  if (getMethod) {
    let p = Object.getPrototypeOf(obj)
    keys = Object.getOwnPropertyNames(p)
  }

  keys.filter(k => k !== 'constructor').forEach(key => {
    func(obj[key], key)
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
  public store: any
  private dispatcher = {}
  private calcFields = {}

  constructor(services: T, middleware: any[] = []) {
    this.initStore(services, middleware)
  }

  private initStore(services: T, middleware: any[] = []) {
    const reducers = {}
    forEach(services as any, (service, serviceName) => {
      //states
      const serviceState = {}
      console.log('states')
      forEach(service, (val, key) => {
        console.log(key)
        serviceState[key] = val
      })
      //dispatch wrapper, so we can dispatch with method calling
      const dispatch = {}
      this.dispatcher[serviceName] = dispatch
      //selectors
      const calcFields = {}
      this.calcFields[serviceName] = calcFields
      //reducers
      const serviceReducers = [] as Function[]
      console.log('reducers')
      forEach(
        service,
        (method, methodName) => {
          console.log(method, methodName)
          if (method.isCalc) {
            calcFields[methodName] = function () {
              return method.call(store.getState()[serviceName])
            }
          } else {
            const actionType = `${serviceName}/${methodName}`
            const reducer = (state: any, action: any) => {
              let ret = state
              if (action.type == actionType) {
                if (method.isEffect) {
                  //pass dispatch as this, state as second arguments just in case
                  ret = produce(state, draftState => {
                    method.call(dispatch, action.payload, draftState)
                  })
                } else {
                  //pass state as this
                  //use the mighty immer
                  ret = produce(state, draftState => {
                    method.call(draftState, action.payload)
                  })
                }
              }
              return ret
            }
            dispatch[methodName] = function (payload: any) {
              store.dispatch({
                type: actionType,
                payload: payload
              })
            }
            serviceReducers.push(reducer)
          }
        },
        true
      )

      reducers[serviceName] = function (state: any, action: any) {
        if (state == undefined) state = serviceState
        return serviceReducers.reduce((s, reducer) => reducer(s, action), state)
      }
    })

    const composeEnhancers = window['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__'] || compose;
    const store = createStore(combineReducers(reducers), composeEnhancers(
      applyMiddleware(...middleware)
    ))

    this.store = store
  }

  get dispatch(): T {
    return this.dispatcher as any
  }

  /**
   * root state
   */
  get state(): T {
    return this.store.getState()
  }

  /**
   * root calc dictionary which contains all calculated fields
   */
  get calc(): T {
    return this.calcFields as any
  }

  /**
   * connect decorator to use with React.Component.
   * it maps state (or calcudated fields) to component props
   */
  get connect() {
    const { calc } = this
    const connect = function (stateMap: ((state: T) => object), calcMap?: (calc: T) => object) {
      return function (method: any) {
        return reduxConnect((state: any) => {
          console.log('reduxConnect')
          const map1 = stateMap(state),
            map2 = calcMap ? calcMap(calc) : null
          return { ...map1, ...map2 }
        })(method) as any
      }
    }
    return connect
  }

  get Provider() {
    const { store } = this
    return (props: any) => {
      return React.createElement(Provider, { store }, props.children)
    }
  }
}

export { ServiceStore, effect, calc }
