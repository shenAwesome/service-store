import * as React from 'react';
import * as classnames from 'classnames'
import { PathTest, match, RouteManager, withPath, withManager } from './core'


interface LinkProp {
    /** navigating path when clicked */
    to: string
    /** add active class when condition matches */
    test?: PathTest,
    manager?: RouteManager
    path?: string
}

@withManager
@withPath
class Link extends React.PureComponent<LinkProp> {

    click = () => {
        const { manager, to } = this.props
        manager.history.push(to)
    }
    render() {
        return <a onClick={this.click} className={classnames('srLink', {
            active: this.isActive()
        })}> {this.props.children}  </a>
    }
    isActive() {
        const { path } = this.props,
            test = this.props.test || this.props.to
        return match(path, test)
    }
}

export { Link }