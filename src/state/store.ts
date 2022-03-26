import {
  applyMiddleware, createStore, Middleware, PreloadedState, Store,
} from 'redux';
import { createLogger } from 'redux-logger';

import { isDev } from '../utils';
import reducer, { initialState, reconcileState } from './reducer';
import { State } from './types';


const createAppStore = ({
  preloadedState, middlewares = [], logger = console,
}: {
  logger?: any;
  preloadedState?: PreloadedState<State>;
  persist?: boolean;
  middlewares?: Middleware[];
} = {}): Store<State> => {
  let fullMiddlewares = middlewares;
  if (isDev) {
    const reduxLogger = createLogger({ logger });
    fullMiddlewares = [...fullMiddlewares, reduxLogger];
  }

  const store = createStore(
    reducer,
    reconcileState({
      liveState: initialState.liveState,
      settings: preloadedState?.settings ?? initialState.settings,
    }),
    applyMiddleware(...fullMiddlewares),
  );
  return store;
};

export default createAppStore;
