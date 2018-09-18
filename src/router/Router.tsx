import * as React from 'react';
import { PathProvier, ManagerProvier, RouteManager } from './core'
import { History, HashHistory } from './History'
import './Router.scss'

const defaultManager: RouteManager = {
    history: new HashHistory,
    getDirection(oldPath: string, newPath: string) {
        function parts(str: string) {
            return str.split('/').length
        }
        function last(str: string) {
            return str.split('/').pop()
        }
        var reverse = (parts(oldPath) > parts(newPath))
            || (last(oldPath) > last(newPath))

        return {
            reverse
        }
    },
    redirects: {},
    skipAnimation: []
}

interface RouterProps {
    manager?: Partial<RouteManager>
}

class Router extends React.PureComponent<RouterProps>{
    state = {
        path: ''
    }

    manager = Object.assign({}, defaultManager, this.props.manager)

    //manager.history.redirects = manager.redirects

    render() {
        const { manager } = this
        manager.history.redirects = manager.redirects
        return <ManagerProvier value={manager}>
            <PathProvier value={this.state.path}>
                {this.props.children}
            </PathProvier>
        </ManagerProvier >

    }

    onHistoryChange = (path) => {
        this.setState({
            path: window.location.hash.replace('#', '')
        })
    }

    get history() {
        return this.manager.history
    }
    componentDidMount() {
        const { history } = this
        history.addHandler(this.onHistoryChange).fire()
    }
    componentWillUnmount() {
        this.manager.history.removeHandler(this.onHistoryChange)
    }
}

export { Router }