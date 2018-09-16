import * as React from 'react';
import './App.css';
import { connect, dispatch } from './service'
import { Link, Router, Route, Container } from './srouter'

class TabSample extends React.Component {

  public render() {
    return (
      <div className='tabs'>
        <div className='head'>
          <Link to='Menu1/TabSample/tab1'>tab1</Link>
          <Link to='Menu1/TabSample/tab2'>tab2</Link>
          <Link to='Menu1/TabSample/tab3'>tab3</Link>
        </div>

        <Container transitionDuration={400}>{(path: string) => {
          return <div className='box' key={path}>{path}</div>
        }}</Container>
      </div>
    )
  }
}

export { TabSample };
