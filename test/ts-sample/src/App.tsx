import * as React from 'react';
import './App.css';
import { connect, dispatch } from './service'

@connect(state => ({
  name: state.cart.name,
  count: state.cart.products.length,
  total: state.cart.total(),
  loading: state.Loading.count()
}))
class App extends React.Component {
  onClick() {
    dispatch.cart.add({
      name: 'new prod',
      price: 100,
      amount: 1
    })
  }
  onClick2() {
    dispatch.cart.addAsync({
      name: 'new prod',
      price: 120,
      amount: 1
    })
  }
  public render() {
    //console.log(this.props)
    const { count, total, loading } = this.props as any
    return (
      <div className="App" style={{ padding: '100px', fontSize: '50px' }}>
        <div>count:{count}</div>
        <div>total:{total}</div>
        <button onClick={this.onClick}>add</button>
        <button onClick={this.onClick2}>addAsync</button>
        <div>loading={loading}</div>
      </div >
    );
  }
}

export default App;
