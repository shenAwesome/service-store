import * as React from 'react';
import { RouteManager, withManager } from './core'


@withManager
class BackButton extends React.PureComponent<{
    manager?: RouteManager
}> {
    click = () => {
        this.props.manager.history.goBack()
    }
    render() {
        return <a onClick={this.click} className='BackButton'> {this.props.children}  </a>
    }
}

export { BackButton }