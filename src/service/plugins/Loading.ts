
import { computed, middleware, Action } from '../core'

/* built in models */
/**
 * for showing loading status
 */
class Loading {

    current: { [actionType: string]: number } = {}

    @computed
    count() {
        const { current } = this
        return Object.keys(current)
            .reduce((count, key) => count + current[key], 0)
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
}

export { Loading }