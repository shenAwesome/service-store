import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';
import './index.css';

export function run() {
  ReactDOM.render(
    <App />,
    document.getElementById('root') as HTMLElement
  );
}