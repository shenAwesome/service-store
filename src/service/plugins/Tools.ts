import { computed, middleware, Action, effect, Model } from '../core'
import * as React from 'react'
import { createUI } from './ToolsUI'

/**
 * Tools plugin provides common functions, it needs to work together with ToolsUI component
 */
class Tools extends Model {
  dialogs = []
  progress = { percentage: -1, message: '' }

  /** a resuable effect to open a dialog, returns the index of the button clicked */
  @effect
  async showDialog(dialog: Dialog) {
    const broker = this.getBroker()
    const ret = await broker.run(id => {
      //onstart will be called immediately with an auto generated id
      dialog.id = id //the transaction id, UI Component uses the id to return value via broker.solve
      this.addDialog(dialog) //call reducer to change state which will change UI
    }) //finishes after Component calls the broker.solve(id,value)
    this.removeDialog(dialog) //reducer to remove the dialog
    return ret //this is the value from UI
  }

  private addDialog(dialog: Dialog) {
    this.dialogs.push(dialog)
  }
  private removeDialog(dialog: Dialog) {
    this.dialogs = this.dialogs.filter(a => a.id !== dialog.id)
  }

  @effect
  async sleep(ms: number) {
    await new Promise(solve => {
      setTimeout(solve, ms)
    })
  }

  showProgress(progress: { percentage: number; message: string }) {
    this.progress = progress
  }

  onModelInstalled(store: any, dispatch: Tools, modelId: string) {
    const UI = createUI(store)
    store.pluginUIs.push(UI)
  }
}

interface Dialog {
  id?: string
  message: string
  title?: string
  buttons?: string[]
}

export { Tools }
