import * as React from 'react';
import { connect, dispatch } from './service'
import './App.scss'


@connect(s => ({
  points: s.test.points
}))
class App extends React.Component {
  render() {
    const { points } = this.props as any
    return <div>
      <div>points:{points}</div>
      <button onClick={this.add}>add</button>
      <button onClick={this.add2}>async add</button>
    </div>
  }

  add = () => {
    dispatch.test.add(2)
  }

  add2 = () => {
    dispatch.test.add2(1)
  }
}

export { App }