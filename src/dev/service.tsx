import { createStore, plugins } from '..'
import { effect, getService } from '../service/core';

function delay(sec: number) {
  return new Promise(resolve => setTimeout(resolve, sec * 1000))
}

class Test {
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
    let common = getService<Common>('common', this)   //call reducers or effects on other model
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

const { Provider, connect, dispatch } = createStore({
  test: new Test(),
  common: new Common(),
  Loading: new plugins.Loading()
})

export { Provider, connect, dispatch }