import * as React from 'react';
import { Tools } from '../Tools'
import { ServiceStore } from '../../ServiceStore'
import * as classNames from 'classnames'
import './ToolsUI.scss'

class ToolsUI extends React.PureComponent {
  render() {
    const { broker, dialogs, progress } = this.props as any,
      dialogsEle = (dialogs && dialogs.length) ?
        dialogs.map((a, i) => (
          <Dialog config={a} broker={broker} key={'dialog_' + a.id} />
        )) : null,
      progressEle = (progress && progress.percentage > 0) ?
        <Progress config={progress} broker={broker} key='progress' /> : null

    return <div className='ToolsUI'>
      {dialogsEle}
      {progressEle}
    </div>
  }
}

class Dialog extends React.Component<any> {
  render() {
    const { config, className } = this.props as any,
      { title, message } = config
    const buttons = config.buttons || ['OK']

    console.log(classNames("Dialog", className))

    return <div className='container'>
      <div className={classNames("Dialog", className)}>
        {(title) ? <div className='header'>{title}</div> : null}
        <div className='content'>{message}</div>
        <div className='actions'>{buttons.map((b, i) => <button key={b} onClick={() => {
          this.btnClick(i)
        }}>{b}</button>)}</div>
      </div>
      <div className="DialogMask" />
    </div>
  }

  btnClick = (idx: number) => {
    const { broker, config } = this.props as any
    broker.solve(config.id, idx)
  }
}


class Progress extends React.Component<any> {
  render() {
    const { broker, config } = this.props as any,
      { percentage, message } = config,
      label = parseInt(percentage) + '%',
      barStyle = { width: label }

    console.log(config)
    return <div className='container'>
      <div className="Dialog Progress">
        <div className='content'>{message}</div>
        <div className='bar meter'>
          <span style={barStyle} >{percentage <= 100 ? label : ''}</span>
        </div>
      </div>
      <div className="DialogMask" />
    </div>
  }
}

function createUI(store: ServiceStore<any>) {
  const { connect } = store,
    modelId = store.getModelIdByClass(Tools)
  const Cls = connect(s => {
    const tools = s[modelId] as Tools
    return {
      dialogs: tools.dialogs,
      progress: tools.progress,
      broker: tools.getBroker()
    }
  })(ToolsUI)
  return Cls
}

export { createUI }