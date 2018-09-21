import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { App } from './App'

import { Provider, ToolsUI, LoadingUI } from './service'

ReactDOM.render(
  <Provider>
    <div>
      <App />
      <ToolsUI />
      <LoadingUI />
    </div>
  </Provider>,
  document.getElementById('root')
);