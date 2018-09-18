import * as React from 'react';

interface RedirectProp {
    to: string
}

class Redirect extends React.Component<RedirectProp> {
    render() {
        return null
    }
    componentDidUpdate() {
        this.execute()
    }
    execute() {
        console.log(this.props.to)
    }
}

export { Redirect }