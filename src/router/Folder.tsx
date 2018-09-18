import * as React from 'react';

import classnames from 'classnames'
import { withPath, withManager, RouteManager, PathTest, match } from './core'

type Actions = 'WillEnter' | 'Enter' | 'WillLeave' | 'Leave' | ''
interface FolderProp {
    test: PathTest,
    className?: string
    transitionDuration?: number
    manager?: RouteManager,
    path?: string
}
interface FolderState {
    show: boolean
    action: Actions
    props: any
    firstRender: boolean
    mounted: boolean
}

@withManager
@withPath
class Folder extends React.PureComponent<FolderProp> {

    static defaultProps: Partial<FolderProp> = {
        transitionDuration: 300
    }

    state: FolderState = {
        show: false,
        action: '',
        props: null,
        firstRender: true,
        mounted: false
    }

    static getDerivedStateFromProps(props: FolderProp, state: FolderState) {
        //no need to handle them 
        if (!state.mounted || props == state.props) return state

        const { test, path } = props,
            show = match(path, test)
        if (show !== state.show) {
            let action = show ? 'WillEnter' : 'WillLeave'
            if (state.firstRender) action = ''
            return {
                show: true, action, props,
                firstRender: false
            }
        }
        return { ...state, firstRender: false }
    }

    render() {
        const { path, manager, transitionDuration } = this.props
        if (!path) return null
        const { action, show } = this.state
        const content = this.props.children

        const clsName = {
            WillEnter: 'leave',
            Leave: 'leave',
            Enter: 'stay',
            WillLeave: 'stay'
        }[action] || ''

        return (
            <div className={classnames('srFolder', this.props.className, clsName, { hidden: !show })} style={{
                transitionDuration: (this.props.transitionDuration) + 'ms'
            }}>
                {content}
            </div>
        )
    }

    timers = []
    clearTimer() {
        const { timers } = this
        if (timers.length) {
            timers.forEach(t => clearTimeout(t))
            timers.length = 0
        }
        return timers
    }

    componentDidUpdate() {
        const { action } = this.state
        if (action.startsWith('Will')) {
            const timers = this.clearTimer()
            timers.push(setTimeout(() => {
                this.setState({ action: action.replace('Will', '') })
            }, 10))
            timers.push(setTimeout(() => {
                this.setState({
                    action: '',
                    show: !action.endsWith('Leave')
                })
            }, this.props.transitionDuration))
        }
    }

    componentDidMount() {
        this.state.mounted = true
    }
    componentWillUnmount() {
        this.state.mounted = false
    }
}

export { Folder }