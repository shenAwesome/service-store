import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { App } from './App'

import { Provider } from './service'

export function run() {
  ReactDOM.render(
    <Provider>
      <App />
    </Provider>,
    document.getElementById('root')
  )
}