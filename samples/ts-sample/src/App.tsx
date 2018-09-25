import * as React from 'react';
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

  testInteraction() {
    dispatch.model2.testInteractions();
  }

  public render() {
    //console.log(this.props)
    const { count, total, loading } = this.props as any
    return (
      <div className="App" style={{ padding: '10px', fontSize: '50px' }}>
        <div>count:{count}</div>
        <div>total:{total}</div>
        <button onClick={this.onClick}>add</button><br />
        <button onClick={this.onClick2}>addAsync</button><br />
        <button onClick={this.testInteraction}>testInteraction</button><br />
      </div >
    );
  }
}

export { App }
