# ServiceStore
Writing Redux can be tedious. Instead of writing the similar boilerplate code again and again, with ServiceStore you can write model classes, which will be automatically converted to redux store, actions & reducers.

online demo: https://codesandbox.io/s/3080p3y2j5

![](https://shenawesome.github.io/img/ServiceStore.jpg)

### Install

```bash
yarn add service-store 
-or-
npm install service-store 
```
### Usage

# 1 create a model class

```
import { ServiceStore, effect, computed, plugins } from 'service-store'

class Cart {

    //---------------------- state fields-----------------------
    /** cart's name */
    name = 'My nice cart'
    /** product list */
    products = []

    //--------------------- pure functions (reducers)
    /**
     * add a product
     * @param prod 
     */
    add(prod) {
        this.products.push(prod)
    }

    //--------------------- async functions (effects), can only call pure function, no access to state 
    /**
     * add a product in 1 sec
     * @param prod 
     */
    @effect
    async addAsync(prod) {
        await new Promise(resolve => setTimeout(resolve, 1 * 1000))
        this.add(prod)
    }

    //--------------------- computed fields ----------------------- 
    /** total price */
    @computed
    total() {
        return this.products.reduce((a, b) => a + (b.price * b.amount), 0)
    }
}
```
# 2 create the root service
```
const service = new ServiceStore({
    cart: new Cart
}) 
const { Provider, connect, dispatch } = service
export { Provider, connect, dispatch }
```
# 3 use Provider in the index.js
```
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

import { Provider } from './service'

ReactDOM.render(
    <Provider><App /></Provider>,
    document.getElementById('root')
);
registerServiceWorker();
```
# 4 use connect and dispatch in the component
```
import React, { Component } from 'react';
import './App.css';
import { dispatch, connect } from './service'

@connect(state => ({
  name: state.cart.name,
  count: state.cart.products.length,
  total: calc.cart.total() //computed field can be used in connect
})
class App extends React.Component {
  onClick() {
    dispatch.cart.add({
      name: 'new prod',
      price: 100,
      amount: 1
    })
  }
  render() {
    console.log(this.props)
    const { count } = this.props
    return (
      <div className="App" style={{ padding: '100px', fontSize: '50px' }}>
        <div>{count}</div>
        <button onClick={this.onClick}>click</button>
      </div >
    );
  }
}

export default App;

````


### Features

- Provide much better intellisense than vanilla redux (tested with VS code)
- Support typescript & JavaScript react app (tested with create react app. decorator needs to enabled) 
- Let you write redux components in intuitive OOP style. You can focus on the business logic when implementing the ServiceStore (the root store contains all models)
- Model classes are transferred to redux components and run as redux components. It is just a thin wrapper around redux which provides OOP style API. You don't lose any redux benefit/features and can call redux API directly when needed. Redux dev tool and any other redux tools/libs can be used without difference.


 
