import * as React from 'react';

type Actions = 'WillEnter' | 'Enter' | 'WillLeave' | 'Leave' | ''
interface CompInfo {
    comp: JSX.Element
    action: Actions
}

interface TransitionProp {
    component?: JSX.Element
    transitionDuration?: number
    getClassName?: (action: string) => string
}
interface TransitionState {
    components: CompInfo[]
    props: any
}
class Transition extends React.PureComponent<TransitionProp, TransitionState> {
    static defaultProps: Partial<TransitionProp> = {
        transitionDuration: 300,
        getClassName: (action: string) => action
    }

    state: TransitionState = {
        components: [],
        props: null
    }

    static getDerivedStateFromProps(props: TransitionProp, state: TransitionState) {
        if (props == state.props) return state
        //compare prop to state comp list, new->enter, missing->leave
        const oldComps = state.components.map(info => info.comp),
            newComps = props.component ? [props.component] : React.Children.toArray(props['children']) as JSX.Element[]

        const init = (oldComps.length == 0),
            sampeComp = (oldComps.length == 1 && newComps.length == 1 && oldComps[0] == newComps[0])

        const newCompInfos = newComps.map(newComp => {
            const existing = oldComps.some(co => co == newComp)
            return {
                comp: newComp as JSX.Element,
                action: existing || init || sampeComp ? '' : 'WillEnter'
            }
        })
        const toLeave = oldComps.filter(c => newComps.indexOf(c) == -1).map(c => ({
            comp: c,
            action: 'WillLeave'
        }))
        return {
            components: newCompInfos.concat(toLeave),
            props: props
        }
    }

    render() {
        const { components } = this.state,
            { getClassName } = this.props
        return <>{components.map((c: CompInfo, i) => <div key={i} style={{
            transitionDuration: (this.props.transitionDuration) + 'ms'
        }} className={getClassName(c.action)}>{c.comp}</div>)}</>
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
    fnishAnimation() {
        const { components } = this.state,
            enters = components.filter(c => c.action == 'Enter'),
            leaves = components.filter(c => c.action == 'Leave')
        if (enters.length + leaves.length) {
            const newComp = components.filter(c => leaves.indexOf(c) == -1)
            newComp.forEach(c => c.action = '')
            this.setState({ components: newComp })
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
            const timers = this.clearTimer()
            timers.push(setTimeout(() => {
                this.startAnimation()
            }, 10))
            timers.push(setTimeout(() => {
                this.fnishAnimation()
            }, this.props.transitionDuration))
        }
    }

    componentWillUnmount() {
        this.clearTimer()
    }

}

export { Transition }