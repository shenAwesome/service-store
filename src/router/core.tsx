import * as console from 'console';

import * as React from 'react';
import { History } from './History'

if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (searchString, position) {
        position = position || 0;
        return this.indexOf(searchString, position) === position;
    }
}
const { Provider: PathProvier, Consumer: PathConsumer } = React.createContext<string>('');
const { Provider: ManagerProvier, Consumer: ManagerConsumer } = React.createContext<RouteManager>(null)


function withPath(Component) {
    return function (props) {
        return (
            <PathConsumer>
                {value => <Component {...props} path={value} />}
            </PathConsumer>
        )
    } as any
}
function withManager(Component) {
    return function (props) {
        return (
            <ManagerConsumer>
                {value => <Component {...props} manager={value} />}
            </ManagerConsumer>
        )
    } as any
}

function isFunction(functionToCheck: any) {
    return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
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

type PathTest = string | RegExp | ((path: string) => boolean)

interface Direction {
    reverse: boolean
}

type RouteManager = {
    history: History
    getDirection: (oldPath: string, newPath: string) => Direction
    redirects: { [path: string]: string }
    skipAnimation: string[]
}


export { PathProvier, withPath, ManagerProvier, withManager, RouteManager, match, PathTest }
