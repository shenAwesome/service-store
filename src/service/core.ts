import './polyfill'

interface Action {
  type: string
  payload: any
  effectId?: string
  isEffectFinish?: boolean
}


//const effect = createTag('Effect') as Tag
/** effects handles side effects/async tasks, the method needs to be async  */
function effect(target: Object, key: string,
  desc: TypedPropertyDescriptor<(payload?: any) => Promise<any>>) {
  target[key]['isEffect'] = true
}

function singleEffect(runAt: 'Last' | 'First' = 'Last', debounce = 1) {
  return function (target: Object, key: string,
    desc: TypedPropertyDescriptor<(payload?: any) => Promise<any>>) {
    target[key]['isEffect'] = true
    target[key]['singleEffect'] = {
      runAt, debounce
    }
  }
}


/** computed fields can be used in 'connect', it output values based on state  */
function computed(target: Object, key: string,
  desc: TypedPropertyDescriptor<() => any>) {
  target[key]['isComputed'] = true
}

/** tag a method a middleware, can only be used on method of a Plugin class  */
function middleware(target: Plugin, key: string,
  desc: TypedPropertyDescriptor<(ctx: middleware.Context, info: middleware.Info) => any>) {
  target[key]['isMiddleware'] = true
}

module middleware {
  export interface Context {
    store: any
    next: Function
    action: Action
  }
  export interface Info {
    type: string
    isEffect: boolean
    isEffectFinish: boolean
    isPluginAction: boolean
    effectId: string
    effectRootId: string
    model: any
    serviceStore: any
  }
}

/**
 * Model class provides helper methods like getSibling.
 * It's not mandatory for a model to extend this class, unless it needs those methods
 */
class Model {
  /**
   * fetch sibling model for reading its state or calling its reducer/effect
   * @param modelId
   */
  protected getModel<T>(Class: new () => T): T {
    return null
  }

  getBroker(): UIBroker {
    return null
  }

  /** trigged when model is installed  */
  protected onModelInstalled(storeSore: any, dispatch: any, modelId: string) { }
}

/**
 * Implement Plugin to provide common functions like logging, displaying loading bar
 * Plugin class doesn't provide any extra function than Model class, at the moment
 */
class Plugin extends Model {
  _isPlugin_ = true
}

/**
 * the UI Broker handls small user interaction, like alert or prompt.
 * service store contains a single broker.
 */
class UIBroker {
  private pool: { [pid: string]: Function } = {}

  run(onStart: (id: string) => void, onFinish?: (ret: any) => void) {
    const { pool } = this,
      id = this.createUniqId()
    return new Promise(resolve => {
      onStart(id)
      pool[id] = (ret: any) => {
        if (onFinish) onFinish(ret)
        resolve(ret)
      }
      this.notify()
    })
  }

  private createUniqId() {
    return (
      Date.now().toString(36) +
      Math.random()
        .toString(36)
        .substr(2, 5)
    ).toUpperCase()
  }

  solve(pid, ret) {
    const solve = this.pool[pid]
    solve(ret)
    delete this.pool[pid]
    this.notify()
  }

  get count() {
    return Object.keys(this.pool).length
  }

  private notify() {
    this.observers.forEach(ob => ob(this))
  }

  private observers = []
  addObserver(ob: (brokder: UIBroker) => void) {
    this.observers.push(ob)
  }
}

export { effect, singleEffect, computed, middleware, Action, Model, Plugin, UIBroker }
