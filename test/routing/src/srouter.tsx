import * as React from 'react';
import * as classnames from 'classnames'

if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (searchString, position) {
        position = position || 0;
        return this.indexOf(searchString, position) === position;
    }
}

const { Provider: PathProvier, Consumer: PathConsumer } = React.createContext<string>('');
const { Provider: ManagerProvier, Consumer: ManagerConsumer } = React.createContext<RouteManager>(null)


type PathTest = string | RegExp | (() => boolean)


interface RouterProps {
    manager?: RouteManager
}

class Router extends React.PureComponent<RouterProps>{
    state = {
        path: ''
    }
    static defaultProps = {
        manager: (pathA, pathB) => {
            function parts(str: string) {
                return str.split('/').length
            }
            function last(str: string) {
                return str.split('/').pop()
            }
            var reverse = false
            if (parts(pathA) > parts(pathB)) {
                reverse = true
            } else if (last(pathA) > last(pathB)) {
                reverse = true
            }
            return {
                reverse
            }
        }

    }
    render() {
        return <ManagerProvier value={this.props.manager}>
            <PathProvier value={this.state.path}>
                {this.props.children}
            </PathProvier>
        </ManagerProvier >

    }
    hashChange = () => {
        this.setState({
            path: window.location.hash.replace('#', '')
        })
    }
    componentDidMount() {
        window.addEventListener('hashchange', this.hashChange)
        this.hashChange()
    }
    componentWillUnmount() {
        window.removeEventListener('hashchange', this.hashChange)
    }
}

interface LinkProp {
    /** navigating path when clicked */
    to: string
    /** add active class when condition matches */
    test?: PathTest
}
class Link extends React.PureComponent<LinkProp> {
    onClick = () => {
        window.location.hash = this.props.to
    }
    render() {
        return <PathConsumer>{path => (
            <a onClick={this.onClick} className={classnames('srLink', {
                active: this.isActive(path)
            })}> {this.props.children}  </a>
        )}</PathConsumer>
    }
    isActive(path: string) {
        const test = this.props.test || this.props.to
        return match(path, test)
    }
}

interface RouteProp {
    test: PathTest
}

class Route extends React.PureComponent<RouteProp> {
    render() {
        return <PathConsumer>{path => (
            this.isActive(path) ? this.props.children : null
        )}</PathConsumer>
    }
    isActive(path: string) {
        return match(path, this.props.test)
    }
}




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
            console.log('reject ani:' + action)
            console.log(components)
            console.log(props.comp.props.children)
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
            //const { components } = this.state
            //console.log('c len:' + components.length)
            timers.forEach(t => clearTimeout(t))
            timers.length = 0
        }
        return timers
    }

    componentDidUpdate() {
        if (this.state.action == 'WillRun') {
            console.log('update')
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

interface ContainerProp {
    className?: string
    transitionDuration?: number,
    children: (path: string) => JSX.Element | null
}
class Container extends React.PureComponent<ContainerProp> {
    root = React.createRef<HTMLDivElement>()
    _oldPath = ''
    render() {
        return <ManagerConsumer>{manager => <PathConsumer>{path => {
            if (!path) return null
            const { reverse } = manager(this._oldPath, path)
            this._oldPath = path
            //console.log(path)
            const { children: getComponent, transitionDuration } = this.props
            return (<div
                className={classnames('srContainer', this.props.className)}
                ref={this.root}>
                <Transition transitionDuration={transitionDuration}
                    comp={getComponent(path)} reverse={reverse} />
            </div>)
        }}</PathConsumer>}</ManagerConsumer>
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

/**
 * return true|false for a path and a test
 * @param path 
 * @param test 
 */
function match(path: string, test: PathTest) {
    let match = false
    if (test instanceof RegExp) {
        match = test.test(path)
    } else if (isFunction(test)) {
        match = (test as any)(path)
    } else {
        match = path.startsWith(test as string)
    }
    return match
}

function isFunction(functionToCheck: any) {
    return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

interface Direction {
    reverse: boolean
}
type RouteManager = (pathA: string, pathB: string) => Direction

export { Link, Router, Route, Container }