import * as React from 'react';
import './App.scss';
import './loader.scss';
import { connect, dispatch } from './service'
import { TabSample } from './TabSample'
import { Home } from './Home'

import { router } from 'service-store'
const { Link, Router, Route, Carousel, BackButton, Folder } = router

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
    const tabs = <TabSample />

    const redirects = {
      '': 'Menu1/SubMenu1',
      'Menu1': 'Menu1/SubMenu1',
      'Menu1/TabSample': 'Menu1/TabSample/tab1'
    },
      skipAnimation = ['Home']

    const { loading } = this.props as any
    return <>
      <Router manager={{ redirects, skipAnimation }}><div className="App"  >
        <div className='menu menu'>
          <Link to='Home'>Home</Link>
          <Link to='Menu1'>Menu1</Link>
          <Link to='Menu2'>Menu2</Link>
        </div>
        <Folder test={path => path != 'Home'} className='menu2 menu'>
          <Route test='Menu1'>
            <Link to='Menu1/SubMenu1' >SubMenu1</Link>
            <Link to='Menu1/SubMenu2' >SubMenu2</Link>
            <Link to='Menu1/TabSample' >a Tab Sample</Link>
          </Route>
          <Route test='Menu2'>
            <Link to='Menu2/SubMenu1' >SubMenu3</Link>
            <Link to='Home' >go Home</Link>
          </Route>
        </Folder>
        <Carousel>{(path: string) => {
          if (path.startsWith('Menu1/TabSample')) {
            return tabs
          }
          if (path == 'Home') {
            return <Home />
          }
          return <div className='box'>{path}</div>
        }}</Carousel>
      </div ></Router>

      {(loading > 0) ? <div className='loader-wrapper'>
        <div className='loader'></div>
      </div> : null}

    </>
  }
}

export default App;
