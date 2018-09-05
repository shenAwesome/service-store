# ServiceStore
A tool lib that convert class to redux store, actions & reducers.

![](https://shenawesome.github.io/img/ServiceStore.jpg)

### Install

```bash
yarn add service-store  react-redux immer lodash redux @types/react-redux @types/lodash @types/redux
-or-
npm install service-store  react-redux immer lodash redux @types/react-redux @types/lodash @types/redux 
```
### Usage

# 1 create a model class

```
class Cart {

    //---------------------- state -----------------------
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

    //--------------------- selectors ----------------------- 
    /** total price */
    @calc
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
  count: state.cart.products.length
}), calc => ({
  total: calc.cart.total()
}))
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
 - Let you write redux components in OOP style, which is more intuitive in most cases.
 - Model classes are transferred to redux components and run as redux components. You don't lose any redux benefit/features and can call redux API directly if you like.  Redux dev tool and any other redux tools/libs can be used with no difference.


 
