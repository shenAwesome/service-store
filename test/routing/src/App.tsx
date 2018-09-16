import * as React from 'react';
import './App.css';
import { connect, dispatch } from './service'
import { Link, Router, Route, Container } from './srouter'
import { TabSample } from './TabSample'

@connect(state => ({
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
    let tabs = <TabSample />

    const { loading } = this.props as any
    return (
      <Router><div className="App"  >
        <div className='menu menu'>
          <Link to='Menu1'>Menu1</Link>
          <Link to='Menu2'>Menu2</Link>
        </div>
        <div className='menu2 menu'>
          <Route test='Menu1'>

            <Link to='Menu1/SubMenu1' >SubMenu1</Link>
            <Link to='Menu1/SubMenu2' >SubMenu2</Link>
            <Link to='Menu1/TabSample' >a Tab Sample</Link>
          </Route>
          <Route test='Menu2'>
            <Link to='Menu2/SubMenu1' >SubMenu3</Link>
          </Route>
        </div>
        <Container>{(path: string) => {
          if (path.startsWith('Menu1/TabSample')) {
            return tabs
          }
          return <div className='box'>{path}</div>
        }}</Container>
      </div ></Router>
    )
  }
}

export default App;
