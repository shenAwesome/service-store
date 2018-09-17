import * as React from 'react';
import { PathTest, withPath, match } from './core'



type Actions = 'WillEnter' | 'Enter' | 'WillLeave' | 'Leave' | ''
interface CompInfo {
    comp: JSX.Element
    action: Actions
}

interface TransitionProp {
    comp: JSX.Element | null,
    transitionDuration?: number,
    reverse?: boolean
}
interface TransitionState {
    components: CompInfo[]
    action: 'WillRun' | 'Running' | 'Finish'
}
class Transition extends React.PureComponent<TransitionProp, TransitionState> {
    static defaultProps = {
        transitionDuration: 300,
        reverse: false
    }

    state: TransitionState = {
        components: [] as CompInfo[],
        action: 'Finish'
    }

    _lastComp: JSX.Element | null
    static getDerivedStateFromProps(props: TransitionProp, state: TransitionState) {
        const { components, action } = state

        if ((components.length == 1 && components[0].comp == props.comp)
            || (components.length == 2 && components[1].comp == props.comp)) {
            return state
        }

        const newComp = props.comp
        if (newComp == null) return []
        if (components.length == 0) {
            components.push({ comp: newComp, action: '' })
            return { components }
        } else {
            const old = components.pop()
            old.action = 'WillLeave'
            return {
                components: [old, {
                    comp: newComp,
                    action: 'WillEnter'
                }],
                action: 'WillRun'
            }
        }
    }

    getClassName(action: Actions) {
        var className = {
            WillEnter: 'enter',
            Leave: 'leave',
            Enter: 'stay',
            WillLeave: 'stay'
        }[action] || ''
        if (this.props.reverse) {
            className = {
                'enter': 'leave',
                'leave': 'enter'
            }[className] || className
        }
        return className
    }

    render() {
        const { components } = this.state
        return <>{components.map((c: CompInfo, i) => <div key={i} style={{
            transitionDuration: (this.props.transitionDuration + 50) + 'ms'
        }} className={this.getClassName(c.action)}>{c.comp}</div>)}</>
    }

    fnishAnimation() {
        const { components } = this.state,
            enters = components.filter(c => c.action == 'Enter'),
            leaves = components.filter(c => c.action == 'Leave')
        if (enters.length + leaves.length) {
            enters.forEach(c => c.action = '')
            const newComp = components.filter(c => leaves.indexOf(c) == -1)
            this.setState({
                components: newComp,
                action: 'Finish'
            })
        }
    }

    get inTransition() {
        const { components } = this.state,
            willEnters = components.filter(c => c.action == 'WillEnter'),
            willLeaves = components.filter(c => c.action == 'WillLeave')
        return (willEnters.length + willLeaves.length) > 0
    }

    startAnimation() {
        const { components } = this.state,
            willEnters = components.filter(c => c.action == 'WillEnter'),
            willLeaves = components.filter(c => c.action == 'WillLeave')
        if (willEnters.length + willLeaves.length) {
            willEnters.forEach(c => c.action = 'Enter')
            willLeaves.forEach(c => c.action = 'Leave')
            this.setState({
                components: components.slice(),
                action: 'Running'
            })
        }
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
        if (this.state.action == 'WillRun') {
            //console.log('update')
            const timers = this.clearTimer()
            timers.push(setTimeout(() => {
                this.startAnimation()
            }, 50))
            timers.push(setTimeout(() => {
                this.fnishAnimation()
            }, this.props.transitionDuration))
        }
    }

    componentWillUnmount() {
        this.clearTimer()
    }
}

interface RouteProp {
    test: PathTest
    path?: string
    transitionDuration?: number
    transitionClass?: string
}

interface RouteState {
    components: JSX.Element[]
    action: Actions
    show: boolean
}


class Panel extends React.PureComponent<RouteProp, RouteState> {

    state: RouteState = {
        components: [],
        action: '',
        show: false
    }

    static defautProps: Partial<RouteProp> = {
        transitionDuration: 0,
        transitionClass: 'width'
    }

    static getDerivedStateFromProps(props: RouteProp, state: RouteState) {
        const { path, test, transitionDuration } = props,
            show = match(path, test),
            comps = React.Children.toArray(props['children']),
            { action, show: oldShow } = state

        if (transitionDuration && show !== oldShow) {//need to do transition 
            console.log('start ani')
            return {
                components: comps,
                action: show ? 'WillEnter' : 'WillLeave',
                show: show
            }
        } else {
            const components = show ? comps : []
            return { components }
        }
    }

    getClassName(action: Actions) {
        var className = {
            WillEnter: 'enter',
            Leave: 'leave',
            Enter: 'stay',
            WillLeave: 'stay'
        }[action] || ''
        return className
    }

    render() {
        const { components, action } = this.state
        return components
    }

    isActive(path: string) {
        return match(path, this.props.test)
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
        const { components, action } = this.state
        if (action == 'WillEnter') {
            const timers = this.clearTimer()
            timers.push(setTimeout(() => {
                console.log('enter')
                this.setState({ action: 'Enter' })
            }, 50))
            timers.push(setTimeout(() => {
                console.log('enter done')
                this.setState({ action: '' })
            }, this.props.transitionDuration))
        } else if (action == 'WillLeave') {
            const timers = this.clearTimer()
            timers.push(setTimeout(() => {
                console.log('enter')
                this.setState({ action: 'Leave' })
            }, 50))
            timers.push(setTimeout(() => {
                this.setState({ components: [], action: '' })
            }, this.props.transitionDuration))
        }
    }


}

export { Panel }