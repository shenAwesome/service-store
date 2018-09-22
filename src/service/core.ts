import './polyfill'

interface Action {
  type: string
  payload: any
  effectId?: string
}

const createTag = (tag: string) => (target: any, key: string) => {
  target[key]['is' + tag] = true
}
type Tag = (cls: any, method: string) => any

/** effects handles side effects/async tasks  */
const effect = createTag('Effect') as Tag
/** computed fields can be used in 'connect', it output values based on state  */
const computed = createTag('Computed') as Tag
/** tag a method a middleware, should only be used for plugins  */
const middleware = createTag('Middleware') as Tag

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
  protected onModelInstalled(storeSore: any, dispatch: any, modelId: string) {}
}

class Plugin extends Model {}

/**
 * the UI Broker handls small user interaction, like alert or prompt
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

export { effect, computed, middleware, Action, Model, Plugin, UIBroker }
