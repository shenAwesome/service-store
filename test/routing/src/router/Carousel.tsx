import * as React from 'react';
import * as classnames from 'classnames'
import { withPath, withManager, RouteManager } from './core'


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
}
class Transition extends React.PureComponent<TransitionProp, TransitionState> {

    static defaultProps = {
        transitionDuration: 300,
        reverse: false
    }

    state: TransitionState = {
        components: [] as CompInfo[]
    }

    _lastComp: JSX.Element | null
    static getDerivedStateFromProps(props: TransitionProp, state: TransitionState) {
        const { components } = state

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
            newComp.forEach(c => c.action = '')
            this.setState({ components: newComp })
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
            this.setState({ components: components.slice() })
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
        const { components } = this.state
        if (components.some(c => c.action.startsWith('Will'))) {
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

interface CarouselProp {
    className?: string
    transitionDuration?: number,
    children: (path: string) => JSX.Element | null
    manager?: RouteManager,
    path?: string
}

@withManager
@withPath
class Carousel extends React.PureComponent<CarouselProp> {
    root = React.createRef<HTMLDivElement>()
    _oldPath = ''
    render() {
        const { path, manager } = this.props
        if (!path) return null
        const { children: getComponent, transitionDuration } = this.props,
            comp = getComponent(path),
            { reverse } = manager.getDirection(this._oldPath, path),
            body = (manager.skipAnimation.indexOf(path) != -1) ? comp :
                <Transition transitionDuration={transitionDuration}
                    comp={getComponent(path)} reverse={reverse} />
        this._oldPath = path

        return (<div
            className={classnames('srContainer', this.props.className)}
            ref={this.root}>
            {body}
        </div>)
    }

    size = { width: 0, height: 0 }

    readSize() {
        const { current: rootDiv } = this.root
        if (rootDiv) {
            const { width, height } = rootDiv.getBoundingClientRect()
            this.size.width = width
            this.size.height = height
        }
    }

    componentDidUpdate() {
        this.readSize()
    }
    componentDidMount() {
        this.readSize()
    }
}

export { Carousel }