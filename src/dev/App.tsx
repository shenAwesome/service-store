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
      <button onClick={this.alert}>alert</button>
      <br />
      <button onClick={this.testInteraction}>testInteraction</button>
      <button onClick={this.showProgress}>show progress bar</button>
    </div>
  }

  add = () => {
    dispatch.test.add(2)
  }

  add2 = () => {
    dispatch.test.add2(1)
  }

  testInteraction = () => {
    dispatch.test.testInteractions()
  }

  showProgress = () => {
    dispatch.test.showProgress()
  }

  alert = () => {
    //dispatch.test.testAlert('some message')
    dispatch.Tools.showDialog({
      title: 'this is title',
      message: 'this is body',
      buttons: ['OK', 'Cancel']
    })
  }
}

export { App }