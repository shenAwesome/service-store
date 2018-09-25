import * as React from 'react';
import './App.scss';
import { connect, dispatch, Product } from './service'

@connect(state => ({
  total: state.cart.total(),
  products: state.cart.products
}))
class Home extends React.Component {
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
    const { total, products } = this.props as any

    const prodTable = products.map((p: Product, i: number) => <tr key={i}>
      <td>{p.name}</td>
      <td>{p.price}</td>
      <td>{p.amount}</td>
    </tr>)

    return <div className='Home'>
      <div>total:{total}</div>
      <button onClick={this.onClick}>add</button>
      <button onClick={this.onClick2}>async add</button>
      <table style={{ fontSize: '12px' }}>
        <tbody>{prodTable}</tbody>
      </table>
    </div>
  }
}

export { Home };
