
import * as React from 'react';
import { on, addListener } from 'cluster';

interface History {
    current: string
    push(path: string): void
    replace(path: string): void
    go(change: number): void
    goBack(): void
    goForward(): void
    addHandler(handler: Function): History
    removeHandler(handler: Function): History
    fire(): void
    redirects: { [key: string]: string }
}

function removeFirst(str: string, toRemove: string) {
    if (str.indexOf(toRemove) == 0) {
        return str.replace(toRemove, '')
    } else {
        return str
    }
}

class HashHistory implements History {
    get current() {
        return removeFirst(window.location.hash, '#')
    }
    push(path: string) {
        window.location.hash = path
    }
    replace(path: string) {
        const { href } = window.location,
            hashIndex = href.indexOf("#"),
            newURL = href.slice(0, hashIndex >= 0 ? hashIndex : 0) + "#" + path
        window.location.replace(newURL)
    }
    go(change: number) {
        window.history.go(change)
    }
    goBack() {
        this.go(-1)
    }
    goForward() {
        this.go(1)
    }


    handlers = []

    onChange = () => {
        let path = this.current
        //console.log('p=', path)
        const redirect = this.redirects[path]
        if (redirect) {
            this.replace(redirect)
        } else {
            this.handlers.forEach(h => h(path))
        }

    }

    handlerChanged() {
        window.removeEventListener('hashchange', this.onChange)
        if (this.handlers.length > 0) {
            window.addEventListener('hashchange', this.onChange)
        }
    }

    redirects = {}

    addHandler(handler: (path: string) => void) {
        this.handlers.push(handler)
        this.handlerChanged()
        return this
    }
    removeHandler(handler: (path: string) => void) {
        this.handlers = this.handlers.filter(h => h != handler)
        this.handlerChanged()
        return this
    }

    fire() {
        this.onChange()
    }
}

export { History, HashHistory }
