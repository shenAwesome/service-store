import { computed, middleware, Plugin, UIBroker } from '../core'
import { createUI } from './ui/LoadingUI'
/* built in models */
/**
 * for showing loading status
 */
class Loading extends Plugin {
  current: { [actionType: string]: number } = {}
  uiSessionCount = 0

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

  clearAll() {
    this.current = {}
  }

  @middleware
  onDispatch(mwContext: any, modelContext: any) {
    const { isEffect, isEffectFinish, type, serviceStore } = modelContext
    if (serviceStore.effectSessions.length == 0 && this.count() > 0) {
      //force clear all
      this.clearAll()
      return
    }
    if (isEffect) {
      if (isEffectFinish) {
        this.removeAction(type)
      } else {
        this.addAction(type)
      }
    }
  }

  setUiSessionCount(count) {
    this.uiSessionCount = count
  }

  onModelInstalled(store: any, dispatch: Loading, modelId: string) {
    const broker = store.broker as UIBroker
    broker.addObserver(ob => dispatch.setUiSessionCount(ob.count))
    store.pluginUIs.push(createUI(store))
  }
}

export { Loading }
