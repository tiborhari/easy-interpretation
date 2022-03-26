import { applyMiddleware, createStore, Middleware } from 'redux';

import { State } from '../state/types';

const stateVersion = { current: 0 };

export const newStateActionType = '__NEW_STATE';

const newStateAction = (newState: State) => (<const>{ type: newStateActionType, state: newState });

const rendererEnhancer: Middleware = () => next => (action) => {
  if (action.type === newStateActionType) {
    return next(action);
  }
  const newState = window.api.sendAction(stateVersion.current, action);
  return newState;
};

const store = createStore(
  // eslint-disable-next-line @typescript-eslint/default-param-last
  (state = {}, action: ReturnType<typeof newStateAction>) => (
    action.type === newStateActionType ? action.state : state
  ),
  {},
  applyMiddleware(rendererEnhancer),
);

window.api.onNewState((ev, version, newState) => {
  if (version > stateVersion.current) {
    store.dispatch(newStateAction(newState));
    stateVersion.current = version;
  }
});

export default store;
