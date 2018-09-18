

if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (searchString, position) {
        position = position || 0;
        return this.indexOf(searchString, position) === position;
    }
}
if (!String.prototype.endsWith) {
    String.prototype.endsWith = function (search, this_len) {
        if (this_len === undefined || this_len > this.length) {
            this_len = this.length;
        }
        return this.substring(this_len - search.length, this_len) === search;
    };
}


interface Action {
    type: string
    payload: any
    effectId?: string
}

const createTag = (tag: string) => (target: any, key: string) => {
    target[key]['is' + tag] = true
}
type Tag = (cls: any, method: string) => any

/** effects handles side effects/async tasks  */
const effect = createTag('Effect') as Tag
/** computed fields can be used in 'connect', it output values based on state  */
const computed = createTag('Computed') as Tag
/** tag a method a middleware, should only be used for plugins  */
const middleware = createTag('Middleware') as Tag

function getService<T>(name: string, context: any): T {
    return context['_getDispatch_'](name)
}

export { effect, computed, middleware, Action, getService }




