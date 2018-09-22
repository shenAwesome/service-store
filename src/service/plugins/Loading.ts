import { computed, middleware, Plugin, UIBroker } from '../core'
import { createUI } from './LoadingUI'
/* built in models */
/**
 * for showing loading status
 */
class Loading extends Plugin {
  current: { [actionType: string]: number } = {}
  brokerSessionCount = 0

  @computed
  count() {
    const { current } = this
    return Object.keys(current).reduce((count, key) => count + current[key], 0)
  }

  addAction(actionType: string) {
    this.current[actionType] = (this.current[actionType] || 0) + 1
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

  setBrokerSessionCount(count) {
    this.brokerSessionCount = count
  }

  onModelInstalled(store: any, dispatch: Loading, modelId: string) {
    const broker = store.broker as UIBroker
    broker.addObserver(ob => {
      dispatch.setBrokerSessionCount(ob.count)
    })
    const UI = createUI(store)
    store.pluginUIs.push(UI)
  }
}

export { Loading }
