import * as React from 'react';
import classnames from 'classnames'
import { withPath, withManager, RouteManager } from './core'
import { Transition } from './Transition'


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

            getClassName = (action: string) => {
                let className = {
                    WillEnter: 'enter',
                    Leave: 'leave',
                    Enter: 'stay',
                    WillLeave: 'stay'
                }[action] || ''
                if (reverse) {
                    className = {
                        'enter': 'leave', 'leave': 'enter'
                    }[className] || className
                }
                return className
            }

        const body = (manager.skipAnimation.indexOf(path) != -1) ? <div>{comp}</div> :
            <Transition transitionDuration={transitionDuration}
                getClassName={getClassName} component={comp} />
        this._oldPath = path

        return (
            <div className={classnames('srCarousel', this.props.className)} ref={this.root}>
                {body}
            </div>
        )
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