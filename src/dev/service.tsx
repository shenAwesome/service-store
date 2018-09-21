import { createStore, plugins } from '..'
import { effect, Model } from '../service/core';
import { Tools } from '../service/plugins/Tools'
import { createToolsUI } from '../service/plugins/ToolsUI'
import { createLoadingUI } from '../service/plugins/LoadingUI'


function delay(sec: number) {
  return new Promise(resolve => setTimeout(resolve, sec * 1000))
}

class Test extends Model {
  points = 0

  add(change: number) {
    this.points += change //reducers(no decorator methods) can read/write state
  }

  @effect
  async add2(min: number) {  //effects should all be async
    console.log('effect started', this.points, min) //effect can read state and argument
    this.points += 1000 //this has no effect, state is readonly for effect 
    let rnd = await this.random() //effect can read from other effects via 'await'
    console.log('rnd=' + rnd)
    let common = this.getModel(Common)   //call reducers or effects on other model
    common.hi('Jack')
    let greet = await common.greet('Jack')
    console.log(greet)
    this.add(rnd) //effect can call reducer to change state
    console.log('effect finished')
  }

  @effect
  async random() {
    await delay(.5) //delay 
    return Math.round(Math.random() * 10)
  }

  @effect
  async testInteractions() {
    const $ = this.getModel(Tools)
    await $.sleep(1000)
    const ret = await $.showDialog({
      message: "want to start?",
      buttons: ["YES", "NO"]
    })
    await $.sleep(2000)
    await $.showDialog({
      message: "you have clicked " + ((ret == 0) ? 'YES' : 'NO')
    })
  }
}


class Common {

  hi(name: string) {
    console.log(name + ' said hi')
  }

  @effect
  async greet(name: string) {
    await delay(.5) //delay 
    return "hello " + name
  }
}


const store = createStore({
  Loading: new plugins.Loading(),
  Tools: new plugins.Tools(),
  test: new Test(),
  common: new Common()
})
const { Provider, connect, dispatch } = store
//plugin UI components
const ToolsUI = createToolsUI(store)
const LoadingUI = createLoadingUI(store)

export { Provider, connect, dispatch, ToolsUI, LoadingUI }