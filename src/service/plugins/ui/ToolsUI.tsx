import * as React from 'react';
import { UIBroker } from '../../core';
import { Tools } from '../Tools'
import { ServiceStore } from '../../ServiceStore'
import './ToolsUI.scss'

class ToolsUI extends React.PureComponent {
  render() {
    const { dialogs, broker } = this.props as any
    const dialogsEle = (dialogs && dialogs.length) ?
      dialogs.map(a => <Alert config={a} broker={broker} key={a.id} />) : null

    return <div className='ToolsUI'>
      {dialogsEle}
    </div>
  }
}

class Alert extends React.Component<{
  broker: UIBroker,
  config: any
}> {
  render() {
    const { config } = this.props,
      { title, message } = config
    const buttons = config.buttons || ['OK']
    return <div className='container'>
      <div className="Alert">
        {(title) ? <div className='header'>{title}</div> : null}
        <div className='content'>{message}</div>
        <div className='actions'>{buttons.map((b, i) => <button key={b} onClick={() => {
          this.btnClick(i)
        }}>{b}</button>)}</div>
      </div>
      <div className="AlertMask" />
    </div>
  }

  btnClick = (idx: number) => {
    const { broker, config } = this.props
    broker.solve(config.id, idx)
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