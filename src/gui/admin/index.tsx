/* eslint-env browser */
import React from 'react';
import ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import { Provider } from 'react-redux';

import store from '../../mainWindow/store';
import MainView from './MainView';

import './index.scss';


const GUI = () => (
  <Provider store={store}>
    <AppContainer>
      <MainView />
    </AppContainer>
  </Provider>
);


export const render = () => {
  ReactDOM.render(<GUI />, document.getElementById('root'));
};
