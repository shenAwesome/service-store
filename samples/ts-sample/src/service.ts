import { createStore, effect, computed, plugins, Model } from 'service-store'

interface Product {
  name: string
  price: number
  amount: number
}

class Cart {
  //----------------------- state -----------------------
  /** cart's name */
  name = 'My nice cart'
  /** product list */
  products = [] as Product[]

  //----------------------- computed fields -------------
  /** total price */
  @computed
  total() {
    return this.products.reduce((a, b) => a + b.price * b.amount, 0)
  }

  //----------------------- pure functions (reducers), can read/write state
  /**
   * add a product
   * @param prod
   */
  add(prod: Product) {
    this.products.push(prod)
  }

  //----------------------- async functions (effects), can only call pure function and read state
  /**
   * add a product in 1 sec
   * @param prod
   */
  @effect
  async addAsync(prod: Product) {
    console.log('async method says:' + this.name)
    await new Promise(resolve => setTimeout(resolve, 1 * 1000))
    let test1 = await this.async1()
    let test2 = await this.async2()
    console.log('all done', test1 + test2)
    this.add(prod)
  }

  @effect
  async async1() {
    await new Promise(resolve => setTimeout(resolve, 1 * 1000))
    console.log('async1 is done')
    return 100
  }

  @effect
  async async2() {
    await new Promise(resolve => setTimeout(resolve, 1 * 1000))
    console.log('async2 is done')
    return 200
  }
}

const { Tools } = plugins

class Model2 extends Model {
  @effect
  async testInteractions() {
    const $ = this.getModel(Tools)
    await $.sleep(500)
    const ret = await $.showDialog({
      message: 'want to start?',
      buttons: ['YES', 'NO']
    })
    await $.sleep(500)
    await $.showDialog({
      message: 'you have clicked ' + (ret == 0 ? 'YES' : 'NO')
    })
  }
}

const store = createStore(
  {
    Loading: new plugins.Loading(),
    Logging: new plugins.Logging(),
    Tools: new plugins.Tools(),
    cart: new Cart(),
    model2: new Model2()
  },
  []
)

const { Provider, connect, dispatch } = store
//plugin UI components
const { createToolsUI, createLoadingUI } = plugins
const ToolsUI = createToolsUI(store)
const LoadingUI = createLoadingUI(store)

export { Provider, connect, dispatch, ToolsUI, LoadingUI }
