import * as React from 'react';
import { PathTest, withPath, match } from './core'

interface RouteProp {
    path?: string
    test: PathTest
}
/**
 * display or hide child component based on test
 */
@withPath
class Route extends React.PureComponent<RouteProp> {
    render() {
        const { path, test } = this.props,
            show = match(path, test)
        return show ? this.props.children : null
    }
}

export { Route }
