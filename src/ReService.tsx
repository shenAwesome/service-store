import * as React from 'react';

function debounce(func, wait, immediate) {
    var timeout;
    return function () {
        var context = this, args = arguments;
        var later = function () {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

function isFunction(functionToCheck) {
    return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

class Service {
    /** enable auto updateView so you don't need to call updateView explicitly. 
     * don't  use this feature if you need precise control of when to update*/
    autoUpdate = false
    /**
     * convert all property to getter/setter
     */
    _enableAutoUpdate() {
        //find candidates
        let keys = Object.keys(this).filter(key => {
            let valid = false,
                descriptor = Object.getOwnPropertyDescriptor(this, key)
            if (descriptor) {
                valid = !(descriptor.get || descriptor.set || key.startsWith('_') || isFunction(this[key]))
            }
            return valid
        })
        var props = {}
        keys.forEach(key => {
            let value = this[key]
            props[key] = {
                get: function () {
                    this._fieldUsed(key)
                    return value
                },
                set: function (val) {
                    this._fieldUsed(key)
                    value = val
                }
            }
        })
        console.log(props)
        Object.defineProperties(this, props)
    }

    _dirtyFields = []
    _freeze = false

    _fieldUsed(fileldName: string) {
        if (this._freeze) return
        this._dirtyFields.push(fileldName)
        this.updateView(null)
    }

    constructor() {
        setTimeout(() => {
            this.updateView = debounce(this.updateView, 1, false)
            if (this.autoUpdate) this._enableAutoUpdate()
        }, 1);
    }

    updateView(changed: string = '*') {
        if (changed == null) {
            changed = this._dirtyFields.join(',')
            this._dirtyFields.length = 0
        }
        this._freeze = true
        this._observers.forEach(fn => {
            const fields = fn['_fields_']
            let shouldUpdate = false
            if (fields == '*' || changed == '*') {
                shouldUpdate = true
            } else {
                let fields1 = changed.split(','),
                    fields2 = fields.split(',')
                shouldUpdate = fields1.filter(value => -1 !== fields2.indexOf(value)).length > 0
            }
            if (shouldUpdate) fn()
        })
        this._freeze = false
    }

    _observers = []
}
/**
 * class decorator to make HOC
 * @param key 
 */
function connect(constructor: Function, fields = '*') {
    return function (Comp) {
        if (!constructor['_instance_']) {
            constructor['_instance_'] = new (constructor as any)()
        }
        const service = constructor['_instance_'] as Service
        return class extends React.Component {
            render() {
                let props = { ...this.props }
                props['service'] = service
                return <Comp {...props} />
            }

            _update = () => {
                this.setState(null)
            }

            componentDidMount() {
                this._update['_fields_'] = fields
                service._observers.push(this._update)
            }

            componentWillUnmount() {
                const { _observers } = service
                let index = _observers.indexOf(this._update);
                _observers.splice(index, 1);
            }
        } as any
    }
}

//export { injectable, inject, Service, serivce, connect }
export { Service, connect }


/* sample:  
//import { Service, connect } from './ReService'

class TodoService extends Service {
    todos = []
    addTodo(todo) {
        this.todos.push(todo)
        this.updateView()
    }
}

@connect(TodoService)
class TodoList extends React.Component<any> {
    render() {
        const { todos } = this.props.service
        return <div>
            {todos.map((todo, idx) => <div key={idx}>{todo}</div>)}
        </div>
    }
}
@connect(TodoService)
class TodoForm extends React.Component<any> {
    state = {
        todoMsg: ''
    }
    textChange = evt => {
        let todoMsg = evt.target.value
        this.setState({ todoMsg })
    }
    render() {
        const { service } = this.props,
            { todoMsg } = this.state
        return <div>
            <input value={todoMsg} onChange={this.textChange} />
            <button onClick={() => {
                service.addTodo(todoMsg)
            }}>click</button>
        </div>
    }
}

export default class extends React.Component {
    render() {
        return <div>
            <TodoList /><TodoForm />
        </div>
    }
}

*/